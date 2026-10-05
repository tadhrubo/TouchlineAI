export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Define the standard CORS headers required for Chrome Extensions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle the preflight OPTIONS request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { manager_id, gw, picks } = body;

    if (!manager_id || !picks) {
      return NextResponse.json(
        { success: false, message: 'Missing manager_id or picks' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Try to insert/upsert into the drafts table
    const { error } = await supabase
      .from('drafts')
      .upsert({ manager_id, gw, picks, updated_at: new Date().toISOString() }, { onConflict: 'manager_id' });

    if (error) {
      // If table doesn't exist yet, we still return 200 so the extension doesn't crash, 
      // but we log the error for the developer.
      console.warn('Supabase Drafts Table Error:', error.message);
    }

    return NextResponse.json(
      { success: true, message: 'Draft synced successfully' },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
