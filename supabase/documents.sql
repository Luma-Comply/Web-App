-- Create a table for case documents
CREATE TABLE IF NOT EXISTS public.case_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE, -- Optional, can be linked later if uploaded before case creation
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf' or 'docx'
  original_name TEXT NOT NULL,
  is_redacted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

-- Policies for case_documents
CREATE POLICY "Users can view own documents"
  ON public.case_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.case_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.case_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Storage Bucket Setup
-- Note: You'll need to create a bucket named 'case-documents' in the Supabase Dashboard -> Storage

-- Storage Policies (if you can run SQL for storage policies, otherwise set in dashboard)
-- Allow authenticated users to upload files to their own folder (folder name = user_id)
-- OR just allow any authenticated upload for simplicity in this MVP
-- Policy: "Authenticated users can upload case documents"
-- INSERT INTO storage.buckets (id, name) VALUES ('case-documents', 'case-documents') ON CONFLICT DO NOTHING;

-- Policy to allow uploads
-- create policy "Authenticated users can upload"
-- on storage.objects for insert
-- with check ( bucket_id = 'case-documents' and auth.role() = 'authenticated' );

-- Policy to allow viewing
-- create policy "Authenticated users can view"
-- on storage.objects for select
-- using ( bucket_id = 'case-documents' and auth.role() = 'authenticated' );
