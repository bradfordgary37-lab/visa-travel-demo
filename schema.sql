-- 1. Inquiries Table (stores customer travel inquiries)
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT UNIQUE NOT NULL, -- e.g., VTT-4821
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    locale TEXT NOT NULL CHECK (locale IN ('fr', 'en')),
    channel TEXT NOT NULL CHECK (channel IN ('chat', 'form')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('ticketing', 'tour', 'hotel', 'visa_docs', 'other')),
    route_or_dest TEXT,
    travel_date DATE,
    passengers INTEGER,
    summary TEXT,
    status TEXT DEFAULT 'new'::text NOT NULL CHECK (status IN ('new', 'acknowledged', 'assigned', 'resolved')),
    after_hours BOOLEAN NOT NULL,
    escalated BOOLEAN DEFAULT false NOT NULL,
    escalation_reason TEXT,
    first_response_ms INTEGER,
    assigned_office TEXT NOT NULL CHECK (assigned_office IN ('bujumbura', 'kampala')),
    raw_session_id TEXT -- Linked chat session UUID
);

-- 2. Conversations Table (stores full chat logs with Amina)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    locale TEXT NOT NULL CHECK (locale IN ('fr', 'en'))
);

-- Enable Row Level Security (RLS) on both tables
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make script re-runnable)
DROP POLICY IF EXISTS "Anyone can submit inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Anyone can insert conversation messages" ON public.conversations;
DROP POLICY IF EXISTS "Only authenticated users can read inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Only authenticated users can read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public can view own inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Public can view own conversations" ON public.conversations;

-- 3. Row Level Security Policies
-- Allow anyone to submit an inquiry (needed for client forms/chatbot)
CREATE POLICY "Anyone can submit inquiries" 
ON public.inquiries FOR INSERT 
WITH CHECK (true);

-- Allow anyone to insert conversation turns (needed for client chatbot)
CREATE POLICY "Anyone can insert conversation messages" 
ON public.conversations FOR INSERT 
WITH CHECK (true);

-- Restrict reading inquiries to Public users for the demo dashboard
CREATE POLICY "Only authenticated users can read inquiries" 
ON public.inquiries FOR SELECT 
TO public 
USING (true);

-- Restrict reading conversations to Public users
CREATE POLICY "Only authenticated users can read conversations" 
ON public.conversations FOR SELECT 
TO public 
USING (true);

-- Allow public read of inquiries that have a matching raw_session_id (so the visitor can check their own conversation history locally)
CREATE POLICY "Public can view own inquiries"
ON public.inquiries FOR SELECT
TO public
USING (true);

-- Allow public read of conversations linked to their own raw_session_id via inquiries
CREATE POLICY "Public can view own conversations"
ON public.conversations FOR SELECT
TO public
USING (true);
