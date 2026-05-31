// src/lib/supabase.js
// Supabase client initialization and helper functions

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ────────────────────────────────────────────────────────────────────────────
// AUTH HELPERS
// ────────────────────────────────────────────────────────────────────────────

export const auth = {
  // Sign up new user (admin only in most cases)
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  // Sign in
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current session
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  // Get current user
  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    return { data, error };
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ────────────────────────────────────────────────────────────────────────────
// USER ROLE HELPERS
// ────────────────────────────────────────────────────────────────────────────

export const userRoles = {
  // Get current user's role
  async getCurrentRole(userId) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) console.error('Error fetching role:', error);
    return data?.role || null;
  },

  // Assign role to user (admin only)
  async assignRole(userId, role) {
    const { data, error } = await supabase
      .from('user_roles')
      .upsert(
        { user_id: userId, role },
        { onConflict: 'user_id' }
      )
      .select();

    if (error) console.error('Error assigning role:', error);
    return { data, error };
  },
};

// ────────────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ────────────────────────────────────────────────────────────────────────────

export const customers = {
  // Get all customers (filtered by RLS)
  async getAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('active', true)
      .order('name');

    return { data, error };
  },

  // Get single customer with barrel specs
  async getWithSpecs(customerId) {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError) return { data: null, error: customerError };

    const { data: specs, error: specsError } = await supabase
      .from('barrel_specs')
      .select('*')
      .eq('customer_id', customerId)
      .eq('active', true)
      .order('created_at');

    return {
      data: { ...customer, barrel_specs: specs },
      error: specsError,
    };
  },

  // Create customer (admin only)
  async create(customer) {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select();

    return { data, error };
  },

  // Update customer (admin only)
  async update(customerId, updates) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select();

    return { data, error };
  },
};

// ────────────────────────────────────────────────────────────────────────────
// LOADS
// ────────────────────────────────────────────────────────────────────────────

export const loads = {
  // Get loads for date range (supervisor sees today+tomorrow, etc.)
  async getByDateRange(startDate, endDate) {
    const { data, error } = await supabase
      .from('loads')
      .select(
        `
        *,
        customer:customers(*),
        carrier:carriers(*),
        attachments:load_attachments(*)
        `
      )
      .gte('ship_date', startDate)
      .lt('ship_date', endDate)
      .order('ship_date', { ascending: true })
      .order('customer_id', { ascending: true });

    return { data, error };
  },

  // Get loads for a single customer
  async getByCustomer(customerId, startDate, endDate) {
    const { data, error } = await supabase
      .from('loads')
      .select(
        `
        *,
        customer:customers(*),
        carrier:carriers(*),
        attachments:load_attachments(*)
        `
      )
      .eq('customer_id', customerId)
      .gte('ship_date', startDate)
      .lt('ship_date', endDate)
      .order('ship_date', { ascending: true });

    return { data, error };
  },

  // Get single load with all related data
  async getById(loadId) {
    const { data, error } = await supabase
      .from('loads')
      .select(
        `
        *,
        customer:customers(*),
        carrier:carriers(*),
        attachments:load_attachments(*)
        `
      )
      .eq('id', loadId)
      .single();

    return { data, error };
  },

  // Create load (admin only)
  async create(load) {
    const { data, error } = await supabase
      .from('loads')
      .insert([load])
      .select();

    return { data, error };
  },

  // Update load (admin full access, supervisor limited)
  async update(loadId, updates) {
    const { data, error } = await supabase
      .from('loads')
      .update(updates)
      .eq('id', loadId)
      .select();

    return { data, error };
  },

  // Update status only (supervisor)
  async updateStatus(loadId, status) {
    const updates = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'in_process') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed' || status === 'pickup_ready') {
      updates.completed_at = new Date().toISOString();
    }

    return this.update(loadId, updates);
  },

  // Update trailer/seal (supervisor)
  async updatePickupInfo(loadId, trailerNumber, sealNumber) {
    return this.update(loadId, {
      trailer_number: trailerNumber,
      seal_number: sealNumber,
      updated_at: new Date().toISOString(),
    });
  },

  // Get next BOL sequence for month
  async getNextBolSequence(monthYear) {
    const { data, error } = await supabase
      .from('loads')
      .select('bol_sequence')
      .eq('bol_month_year', monthYear)
      .order('bol_sequence', { ascending: false })
      .limit(1);

    if (error) return { sequence: 1, error };

    const nextSequence = (data?.[0]?.bol_sequence || 0) + 1;
    return { sequence: nextSequence, error: null };
  },
};

// ────────────────────────────────────────────────────────────────────────────
// LOAD ATTACHMENTS
// ────────────────────────────────────────────────────────────────────────────

export const loadAttachments = {
  // Upload file to storage
  async uploadFile(loadId, file, fileType, boiNumber, customerName) {
    const fileName = `${boiNumber}_${customerName}.${file.name.split('.').pop()}`;
    const storagePath = `loads/${loadId}/${fileName}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('load-files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      return { data: null, error: storageError };
    }

    // Record attachment metadata
    const { data, error } = await supabase
      .from('load_attachments')
      .insert([
        {
          load_id: loadId,
          file_name: fileName,
          file_type: fileType,
          storage_path: storagePath,
          file_size_bytes: file.size,
          uploaded_by_id: (await supabase.auth.getUser()).data.user.id,
        },
      ])
      .select();

    return { data, error };
  },

  // Get download URL for attachment
  async getDownloadUrl(storagePath) {
    const { data } = supabase.storage
      .from('load-files')
      .getPublicUrl(storagePath);

    return data.publicUrl;
  },

  // Delete attachment
  async delete(attachmentId, storagePath) {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('load-files')
      .remove([storagePath]);

    if (storageError) console.error('Storage delete error:', storageError);

    // Delete metadata record
    const { error: dbError } = await supabase
      .from('load_attachments')
      .delete()
      .eq('id', attachmentId);

    return { error: dbError || storageError };
  },

  // Record signature
  async recordSignature(loadId, attachmentId, signedByName) {
    const { data, error } = await supabase
      .from('load_attachments')
      .update({
        is_signed: true,
        signed_by_name: signedByName,
        signature_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', attachmentId)
      .select();

    return { data, error };
  },
};

// ────────────────────────────────────────────────────────────────────────────
// CARRIERS
// ────────────────────────────────────────────────────────────────────────────

export const carriers = {
  // Get all carriers
  async getAll() {
    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('active', true)
      .order('name');

    return { data, error };
  },

  // Get single carrier
  async getById(carrierId) {
    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('id', carrierId)
      .single();

    return { data, error };
  },
};

// ────────────────────────────────────────────────────────────────────────────
// BARREL SPECS
// ────────────────────────────────────────────────────────────────────────────

export const barrelSpecs = {
  // Get specs for customer
  async getByCustomer(customerId) {
    const { data, error } = await supabase
      .from('barrel_specs')
      .select('*')
      .eq('customer_id', customerId)
      .eq('active', true)
      .order('created_at');

    return { data, error };
  },

  // Create spec (admin only)
  async create(spec) {
    const { data, error } = await supabase
      .from('barrel_specs')
      .insert([spec])
      .select();

    return { data, error };
  },

  // Update spec (admin only)
  async update(specId, updates) {
    const { data, error } = await supabase
      .from('barrel_specs')
      .update(updates)
      .eq('id', specId)
      .select();

    return { data, error };
  },
};

export default supabase;
