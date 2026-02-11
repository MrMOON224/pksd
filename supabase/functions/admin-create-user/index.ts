import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // 1. Create a Supabase client with the Auth context of the logged-in user
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // 2. Verify the requester is an admin
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized: Invalid token' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        const { data: roleData, error: roleError } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (roleError || roleData?.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Only admins can create users' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // 3. Create a Supabase client with the Service Role key to manage users
        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, role, fullName } = await req.json()

        if (!email || !password || !role) {
            throw new Error('Email, password, and role are required')
        }

        // 4. Create the user in Auth
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        })

        if (createError) throw createError

        // 5. Assign the role in user_roles table
        const { error: insertRoleError } = await adminClient
            .from('user_roles')
            .insert({
                user_id: newUser.user.id,
                role: role
            })

        if (insertRoleError) throw insertRoleError

        return new Response(
            JSON.stringify({ success: true, user: newUser.user }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
