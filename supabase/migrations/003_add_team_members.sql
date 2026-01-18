-- Add team owner tracking to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_team_owner BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS team_owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_owner_id, invitee_email)
);

-- Create indexes for team_invitations
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_owner ON public.team_invitations(team_owner_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(invitee_email);

-- Enable RLS for team_invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for team_invitations
CREATE POLICY "Team owners can view their invitations"
  ON public.team_invitations FOR SELECT
  USING (auth.uid() = team_owner_id);

CREATE POLICY "Team owners can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (auth.uid() = team_owner_id);

CREATE POLICY "Team owners can update their invitations"
  ON public.team_invitations FOR UPDATE
  USING (auth.uid() = team_owner_id);

CREATE POLICY "Team owners can delete their invitations"
  ON public.team_invitations FOR DELETE
  USING (auth.uid() = team_owner_id);

-- Policy to allow invited users to view their invitation by token (for acceptance flow)
CREATE POLICY "Users can view invitations by token"
  ON public.team_invitations FOR SELECT
  USING (true);

-- Add trigger for team_invitations updated_at
CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update users policies to allow team members to view team owner info
CREATE POLICY "Team members can view their team owner"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR auth.uid() IN (
    SELECT id FROM public.users WHERE team_owner_id = users.id
  ));

-- Function to get team members count for a user
CREATE OR REPLACE FUNCTION public.get_team_members_count(owner_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.users
  WHERE team_owner_id = owner_id AND is_team_owner = FALSE;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION public.accept_team_invitation(token TEXT)
RETURNS JSONB AS $$
DECLARE
  invitation_record RECORD;
  user_id UUID;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record
  FROM public.team_invitations
  WHERE invitation_token = token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Get current user ID
  user_id := auth.uid();

  IF user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Check if user's email matches invitation
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id AND email = invitation_record.invitee_email
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email mismatch');
  END IF;

  -- Update user to be a team member
  UPDATE public.users
  SET team_owner_id = invitation_record.team_owner_id,
      is_team_owner = FALSE
  WHERE id = user_id;

  -- Mark invitation as accepted
  UPDATE public.team_invitations
  SET status = 'accepted',
      updated_at = NOW()
  WHERE id = invitation_record.id;

  RETURN jsonb_build_object('success', true, 'team_owner_id', invitation_record.team_owner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
