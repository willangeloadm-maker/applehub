import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseUserAgent(userAgent: string) {
  let browser = 'Desconhecido';
  let os = 'Desconhecido';
  let deviceType = 'Desktop';

  // Detect browser
  if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  }

  // Detect OS
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }

  // Detect device type
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    deviceType = 'Mobile';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    deviceType = 'Tablet';
  }

  return { browser, os, deviceType };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { page_visited, referrer, session_id, user_id } = body;

    // Get IP from headers
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       req.headers.get('x-real-ip') || 
                       'Desconhecido';

    const user_agent = req.headers.get('user-agent') || '';
    const { browser, os, deviceType } = parseUserAgent(user_agent);

    // Try to get geolocation from IP (using free service)
    let country = null;
    let city = null;
    
    if (ip_address && ip_address !== 'Desconhecido' && !ip_address.startsWith('192.168') && !ip_address.startsWith('10.') && ip_address !== '127.0.0.1') {
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${ip_address}?fields=country,city`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          country = geoData.country || null;
          city = geoData.city || null;
        }
      } catch (e) {
        console.log('Geolocation lookup failed:', e);
      }
    }

    const { error } = await supabase
      .from('visitor_logs')
      .insert({
        ip_address,
        user_agent,
        device_type: deviceType,
        browser,
        os,
        country,
        city,
        referrer,
        page_visited,
        user_id: user_id || null,
        is_registered: !!user_id,
        session_id,
      });

    if (error) {
      console.error('Error inserting visitor log:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
