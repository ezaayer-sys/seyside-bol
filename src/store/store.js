// src/store/store.js
// Zustand state management for Speyside BOL Manager

import create from 'zustand';
import * as supabaseLib from '../lib/supabase';

// ────────────────────────────────────────────────────────────────────────────
// AUTH STORE
// ────────────────────────────────────────────────────────────────────────────

export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  initialize: async () => {
    try {
      set({ loading: true });

      // Get current session
      const { data, error } = await supabaseLib.auth.getSession();

      if (error || !data.session) {
        set({ user: null, role: null, loading: false });
        return;
      }

      const user = data.session.user;
      set({ user });

      // Get user's role
      const role = await supabaseLib.userRoles.getCurrentRole(user.id);
      set({ role });
      set({ loading: false });
    } catch (error) {
      console.error('Auth init error:', error);
      set({ error: error.message, loading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabaseLib.auth.signIn(email, password);

      if (error) {
        set({ error: error.message, loading: false });
        return false;
      }

      const user = data.user;
      set({ user });

      // Get user's role
      const role = await supabaseLib.userRoles.getCurrentRole(user.id);
      set({ role, loading: false });

      return true;
    } catch (error) {
      set({ error: error.message, loading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      set({ loading: true });
      await supabaseLib.auth.signOut();
      set({ user: null, role: null, loading: false });
    } catch (error) {
      console.error('Logout error:', error);
      set({ error: error.message, loading: false });
    }
  },
}));

// ────────────────────────────────────────────────────────────────────────────
// LOADS STORE
// ────────────────────────────────────────────────────────────────────────────

export const useLoadsStore = create((set) => ({
  loads: [],
  loading: false,
  error: null,
  selectedLoad: null,

  setLoads: (loads) => set({ loads }),
  setSelectedLoad: (load) => set({ selectedLoad: load }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch loads for date range (supervisor uses this for today+tomorrow)
  fetchLoadsByDateRange: async (startDate, endDate) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabaseLib.loads.getByDateRange(
        startDate,
        endDate
      );

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set({ loads: data || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch loads by customer (admin schedule view)
  fetchLoadsByCustomer: async (customerId, startDate, endDate) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabaseLib.loads.getByCustomer(
        customerId,
        startDate,
        endDate
      );

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set({ loads: data || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Get single load with related data
  fetchLoadById: async (loadId) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabaseLib.loads.getById(loadId);

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set({ selectedLoad: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Create new load (admin)
  createLoad: async (loadData) => {
    try {
      set({ loading: true, error: null });

      // Get next BOL sequence for this month
      const { sequence, error: seqError } = await supabaseLib.loads.getNextBolSequence(
        loadData.bol_month_year
      );

      if (seqError) {
        set({ error: seqError.message, loading: false });
        return;
      }

      // Generate BOL number
      const bolNumber = `${loadData.bol_month_year}-${String(sequence).padStart(3, '0')}`;

      const { data, error } = await supabaseLib.loads.create({
        ...loadData,
        bol_number: bolNumber,
        bol_sequence: sequence,
      });

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set((state) => ({
        loads: [...state.loads, data[0]],
        loading: false,
      }));

      return data[0];
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Update load (admin or supervisor depending on field)
  updateLoad: async (loadId, updates) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabaseLib.loads.update(loadId, updates);

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      // Update in store
      set((state) => ({
        loads: state.loads.map((load) =>
          load.id === loadId ? { ...load, ...data[0] } : load
        ),
        selectedLoad:
          state.selectedLoad?.id === loadId
            ? { ...state.selectedLoad, ...data[0] }
            : state.selectedLoad,
        loading: false,
      }));

      return data[0];
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Update load status (supervisor)
  updateLoadStatus: async (loadId, status) => {
    try {
      set({ error: null });

      const { data, error } = await supabaseLib.loads.updateStatus(
        loadId,
        status
      );

      if (error) {
        set({ error: error.message });
        return;
      }

      // Update in store
      set((state) => ({
        loads: state.loads.map((load) =>
          load.id === loadId ? { ...load, ...data[0] } : load
        ),
        selectedLoad:
          state.selectedLoad?.id === loadId
            ? { ...state.selectedLoad, ...data[0] }
            : state.selectedLoad,
      }));

      return data[0];
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Update trailer/seal (supervisor)
  updatePickupInfo: async (loadId, trailerNumber, sealNumber) => {
    try {
      set({ error: null });

      const { data, error } = await supabaseLib.loads.updatePickupInfo(
        loadId,
        trailerNumber,
        sealNumber
      );

      if (error) {
        set({ error: error.message });
        return;
      }

      // Update in store
      set((state) => ({
        loads: state.loads.map((load) =>
          load.id === loadId ? { ...load, ...data[0] } : load
        ),
        selectedLoad:
          state.selectedLoad?.id === loadId
            ? { ...state.selectedLoad, ...data[0] }
            : state.selectedLoad,
      }));

      return data[0];
    } catch (error) {
      set({ error: error.message });
    }
  },
}));

// ────────────────────────────────────────────────────────────────────────────
// CUSTOMERS STORE
// ────────────────────────────────────────────────────────────────────────────

export const useCustomersStore = create((set) => ({
  customers: [],
  loading: false,
  error: null,

  setCustomers: (customers) => set({ customers }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchAll: async () => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabaseLib.customers.getAll();

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set({ customers: data || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchWithSpecs: async (customerId) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabaseLib.customers.getWithSpecs(
        customerId
      );

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));

// ────────────────────────────────────────────────────────────────────────────
// CARRIERS STORE
// ────────────────────────────────────────────────────────────────────────────

export const useCarriersStore = create((set) => ({
  carriers: [],
  loading: false,
  error: null,

  setCarriers: (carriers) => set({ carriers }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchAll: async () => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabaseLib.carriers.getAll();

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set({ carriers: data || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));

// ────────────────────────────────────────────────────────────────────────────
// UI STATE STORE
// ────────────────────────────────────────────────────────────────────────────

export const useUiStore = create((set) => ({
  theme: localStorage.getItem('theme') || 'light', // 'light' or 'dark'
  sidebarOpen: window.innerWidth > 768, // responsive
  selectedDate: new Date(),
  filterCustomer: null,
  filterStatus: null,

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setFilterCustomer: (customerId) => set({ filterCustomer: customerId }),
  setFilterStatus: (status) => set({ filterStatus: status }),
}));
