# Luma - Medical Necessity Documentation Platform

HIPAA-compliant AI-powered platform for generating medical necessity documentation for biologics prior authorizations.

## 🎯 Problem We Solve

- Healthcare providers lose **$100B+ annually** to audit clawbacks due to insufficient documentation
- Providers risk **$1.5M+ HIPAA fines** by using ChatGPT with patient data
- Physicians spend **12-16 hours weekly** on prior authorization paperwork

## ✨ Features

- **HIPAA Compliant**: No PHI required - only patient name + clinical data
- **AI-Powered Generation**: Creates compliant documentation in seconds
- **Audit-Proof**: Built-in compliance checklists for Medicare/Medicaid/Commercial payers
- **Export Options**: Download as Word, PDF, or copy to clipboard
- **Multi-Payer Support**: Medicare, Medicaid, and major commercial insurers

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Anthropic Claude API (Sonnet 3.5/4)
- **File Generation**: docx, pdfkit
- **UI Components**: shadcn/ui, Radix UI, Lucide Icons
- **Fonts**: Inter (Google Fonts)
- **Payments**: Stripe
- **Email**: Resend
- **Hosting**: Vercel

## 🎨 Brand Colors

```css
--dark-bg: #131317
--light-gray: #E0E0D9
--sage-light: #B7D0C1
--sage-medium: #AFC6B9
--sage-dark: #B5CDB9
--mint: #7EA18D (primary)
--tan: #BB966D
--tan-light: #A4784A
--coral: #EC624F (destructive/accent)
```

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Anthropic API key
- Stripe account (for payments)
- Resend account (for emails)

### Setup Steps

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd luma
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**
- Create a new project at [supabase.com](https://supabase.com)
- Go to Project Settings > API to get your URL and keys
- Run the SQL schema from `supabase/schema.sql` in the SQL Editor
- Enable Email authentication in Authentication > Providers

4. **Create environment variables**
```bash
cp .env.example .env.local
```

Fill in your `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Resend
RESEND_API_KEY=your_resend_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
luma/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/          # Login page
│   │   │   └── signup/         # Signup page
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   └── cases/          # Case management
│   │   │       ├── new/        # Create new case
│   │   │       └── [id]/       # View/edit case
│   │   ├── api/
│   │   │   ├── auth/           # Auth endpoints
│   │   │   ├── cases/          # Case CRUD
│   │   │   ├── generate/       # AI generation
│   │   │   └── export/         # File export (Word/PDF)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── auth/               # Auth-related components
│   │   ├── cases/              # Case-related components
│   │   └── layout/             # Layout components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser client
│   │   │   └── server.ts       # Server client
│   │   ├── database.types.ts   # TypeScript types
│   │   └── utils.ts            # Utility functions
│   └── hooks/
│       └── use-toast.ts        # Toast notifications
├── supabase/
│   └── schema.sql              # Database schema
├── public/                     # Static assets
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── package.json
└── README.md
```

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo>
git push -u origin main
```

2. **Deploy on Vercel**
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Add all environment variables from `.env.local`
- Deploy

3. **Configure Supabase**
- Add your Vercel URL to Supabase:
  - Go to Authentication > URL Configuration
  - Add `https://your-app.vercel.app` to Site URL
  - Add `https://your-app.vercel.app/auth/callback` to Redirect URLs

## 🔐 Security & Compliance

### HIPAA Compliance Strategy

**What We DON'T Collect (Safe Harbor Approach):**
- ❌ Date of birth (use age instead)
- ❌ Social Security numbers
- ❌ Medical record numbers
- ❌ Full addresses (state only)
- ❌ Phone/email
- ❌ Specific dates (use relative dates)

**What We DO Collect:**
- ✅ Patient name only
- ✅ Age or age range
- ✅ State of residence
- ✅ Clinical data (diagnosis, labs, treatments)

**Why This Works:**
- Name + clinical data ≠ PHI (under Safe Harbor de-identification)
- No BAA required with users or AI providers
- Dramatically simplified compliance posture

### Security Measures

- Row Level Security (RLS) enabled on all tables
- Encrypted data at rest and in transit
- Input validation and sanitization
- PHI pattern detection and blocking
- Audit logging for all operations
- SOC 2 Type II certification (planned)

## 📊 Database Schema

See `supabase/schema.sql` for complete schema. Key tables:

**users**
- Extends Supabase auth.users
- Stores provider info (NPI, specialty, practice)
- Tracks subscription tier and usage

**cases**
- Stores all documentation cases
- Patient info (name, age, state, gender)
- Clinical data (diagnosis, labs, treatments)
- Generated outputs
- Status tracking

## 🤖 AI Integration

### Claude API Prompt Structure

```typescript
const systemPrompt = `You are a medical documentation specialist...`

const userPrompt = `
Generate medical necessity documentation for:

PATIENT: ${firstName} ${lastName}, ${age} years, ${state}
DIAGNOSIS: ${diagnosisCodes}
LABS: ${labValues}
PRIOR TREATMENTS: ${priorTreatments}
REQUESTED: ${medication} ${dose}
PAYER: ${payerName}

Generate compliant documentation with:
1. Clinical case presentation
2. Medical necessity justification
3. LCD/NCD criteria references
4. Documentation checklist
`
```

## 📝 Roadmap

### Phase 1 (MVP) - Months 1-3
- [x] Landing page
- [ ] Authentication (login/signup)
- [ ] Dashboard with cases table
- [ ] Biologics PA form
- [ ] Claude API integration
- [ ] Word/PDF export
- [ ] Basic analytics

### Phase 2 - Months 4-6
- [ ] Medical necessity letters
- [ ] Appeal documentation
- [ ] More payer coverage
- [ ] Improved analytics
- [ ] Team collaboration features

### Phase 3 - Months 7-12
- [ ] Other specialty drugs
- [ ] EHR integrations (Epic, Cerner)
- [ ] Payer portal integrations
- [ ] Advanced reporting
- [ ] Mobile app

## 💳 Pricing Tiers

| Plan | Price | Cases/Month | Seats |
|------|-------|-------------|-------|
| Professional | $149/mo | 50 | 3 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 📧 Support

For support, email support@luma.health or open an issue.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Database powered by [Supabase](https://supabase.com/)
- AI powered by [Anthropic Claude](https://anthropic.com/)
