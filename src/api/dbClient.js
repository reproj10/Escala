import { supabase } from '../lib/supabaseClient.js';

// Map entity names to Supabase table names
const tableMap = {
  Employee: 'employees',
  ScheduleEntry: 'schedule_entries',
  MedicalCertificate: 'medical_certificates',
  AppConfig: 'app_config',
  AuditLog: 'audit_log',
};

// Generic entity actions builder using Supabase
const createEntityMock = (entityName) => {
  const table = tableMap[entityName];

  return {
    list: async (sortFieldAndOrder = '', limit = 1000) => {
      let query = supabase.from(table).select('*').limit(limit);

      if (sortFieldAndOrder.startsWith('-')) {
        const field = sortFieldAndOrder.substring(1);
        query = query.order(field, { ascending: false });
      } else if (sortFieldAndOrder) {
        query = query.order(sortFieldAndOrder, { ascending: true });
      }

      const { data, error } = await query;
      if (error) {
        console.error(`Error listing ${entityName}:`, error);
        return [];
      }
      return data || [];
    },

    filter: async (queryParams = {}) => {
      // Auto-project schedules for future months if they don't exist yet
      if (entityName === 'ScheduleEntry' && queryParams.month && queryParams.year) {
        const { data: existing } = await supabase
          .from(table)
          .select('*')
          .eq('month', queryParams.month)
          .eq('year', queryParams.year);

        if (!existing || existing.length === 0) {
          console.log(`Generating schedule projection for ${queryParams.month}/${queryParams.year}...`);
          const { projectScheduleForMonth } = await import('./projection.js');
          const generated = projectScheduleForMonth(queryParams.year, queryParams.month);

          if (generated && generated.length > 0) {
            const { error: insertError } = await supabase.from(table).insert(generated);
            if (insertError) {
              console.error('Error inserting projected schedules:', insertError);
            }
          }
          return generated || [];
        }
        return existing;
      }

      let query = supabase.from(table).select('*');
      Object.entries(queryParams).forEach(([key, val]) => {
        query = query.eq(key, val);
      });

      const { data, error } = await query;
      if (error) {
        console.error(`Error filtering ${entityName}:`, error);
        return [];
      }
      return data || [];
    },

    get: async (id) => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error getting ${entityName} by id:`, error);
        return null;
      }
      return data;
    },

    create: async (data) => {
      const newItem = {
        id: `${entityName.toLowerCase().substring(0, 3)}_${Math.random().toString(36).substring(2, 9)}`,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ...data,
      };

      const { data: created, error } = await supabase
        .from(table)
        .insert(newItem)
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${entityName}:`, error);
        throw new Error(error.message);
      }
      return created;
    },

    update: async (id, data) => {
      const updated = {
        ...data,
        updated_date: new Date().toISOString(),
      };

      const { data: updatedItem, error } = await supabase
        .from(table)
        .update(updated)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${entityName}:`, error);
        throw new Error(error.message);
      }
      return updatedItem;
    },

    delete: async (id) => {
      const { data: deletedItem, error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error deleting ${entityName}:`, error);
        throw new Error(error.message);
      }
      return deletedItem;
    },
  };
};

export const db = {
  auth: {
    isAuthenticated: async () => true,
    me: async () => ({
      id: 'usr-1',
      name: 'Gestão UPA',
      email: 'gestaoleitosembu@gmail.com',
      role: 'admin',
    }),
    logout: (redirectUrl) => {
      console.log('Logout', redirectUrl);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    redirectToLogin: (redirectUrl) => {
      console.log('Redirect to Login', redirectUrl);
    },
  },
  entities: {
    Employee: createEntityMock('Employee'),
    ScheduleEntry: createEntityMock('ScheduleEntry'),
    MedicalCertificate: createEntityMock('MedicalCertificate'),
    AppConfig: createEntityMock('AppConfig'),
    AuditLog: createEntityMock('AuditLog'),
  },
  integrations: {
    Core: {
      UploadFile: async (file) => {
        console.log('Uploading file to Supabase Storage', file);
        // Upload to Supabase Storage
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('certificates')
          .upload(fileName, file);

        if (error) {
          console.error('Error uploading file:', error);
          return { file_url: '' };
        }

        const { data: publicUrl } = supabase.storage
          .from('certificates')
          .getPublicUrl(fileName);

        return { file_url: publicUrl?.publicUrl || '' };
      },
    },
  },
};

// Set global __B44_DB__ so that any place using it gets this active DB
if (typeof globalThis !== 'undefined') {
  globalThis.__B44_DB__ = db;
}

export default db;
