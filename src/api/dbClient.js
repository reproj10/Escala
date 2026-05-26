import { importedEmployees, importedSchedules } from './importedData.js';

const initialEmployees = [
  { id: "emp-1", name: "Renata Ap. Bueno Pereira", role: "RES.TECNICA", coren: "484843", shift_type: "diurno_a", work_hours: "07:00 as 19:00", sector: "Supervisão", cycle: "par", contract_type: "Estatutário", status: "active" },
  { id: "emp-2", name: "Paula Daniela Maciel", role: "SUPERVISÃO", coren: "540838", shift_type: "diurno_b", work_hours: "07:00 as 19:00", sector: "Supervisão", cycle: "impar", contract_type: "CLT", status: "active" }
];

const initialSchedules = [];

const initialCertificates = [
  {
    id: "cert-1",
    employee_id: "emp-7",
    employee_name: "Patrícia Gomes Lima",
    cid: "M54.5",
    description: "Dor lombar baixa",
    start_date: "2026-05-10",
    end_date: "2026-05-20",
    days: 10,
    file_url: "",
    created_date: "2026-05-10T14:30:00.000Z"
  }
];

const initialConfigs = [
  {
    id: "cfg-1",
    key: "extra_leaves_unlocked",
    value: false,
    updated_by: ""
  }
];

const initialAuditLogs = [
  {
    id: "log-1",
    type: "schedule",
    description: "Alterou o dia 12 de Renata Ap. Bueno Pereira para Plantão (P)",
    employee_name: "Renata Ap. Bueno Pereira",
    created_date: "2026-05-20T10:15:00.000Z"
  },
  {
    id: "log-2",
    type: "certificate",
    description: "Registrou atestado de 10 dias para Bruna Soares dos Santos (CID: M54.5)",
    employee_name: "Bruna Soares dos Santos",
    created_date: "2026-05-19T14:30:00.000Z"
  },
  {
    id: "log-3",
    type: "employee_create",
    description: "Adicionou o colaborador Maria Fernanda Oliveria Santana (ENFERMEIRA)",
    employee_name: "Maria Fernanda Oliveria Santana",
    created_date: "2026-05-18T09:00:00.000Z"
  }
];

// Helper to get collection from localStorage or fall back to seed data
const getCollection = (name) => {
  if (typeof window === 'undefined') return [];
  
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(`escala_db_${name}`);
  if (stored) {
    try {
      // Force overwrite if it is stale or length is different between employees and schedules
      const storedEmployees = localStorage.getItem('escala_db_Employee');
      const storedSchedules = localStorage.getItem('escala_db_ScheduleEntry');
      const DB_VERSION = 3;
      const storedVersion = localStorage.getItem('escala_db_version');
      let needsReset = false;
      
      if (storedVersion !== String(DB_VERSION)) {
        needsReset = true;
        localStorage.setItem('escala_db_version', String(DB_VERSION));
      }

      if (storedEmployees && !needsReset) {
        try {
          const parsedEmp = JSON.parse(storedEmployees);
          if (parsedEmp.length !== importedEmployees.length) {
            needsReset = true;
          }
        } catch (e) { needsReset = true; }
      } else if (!storedEmployees) { needsReset = true; }
      
      if (storedSchedules) {
        try {
          const parsedSch = JSON.parse(storedSchedules);
          if (parsedSch.length !== importedSchedules.length) {
            needsReset = true;
          }
          
          // Verify that all expected shift types exist in stored schedules
          const presentShifts = new Set(parsedSch.map(s => s.shift_type));
          const expectedShifts = ['diurno_a', 'diurno_b', 'noturno_a', 'noturno_b'];
          const missingAnyShift = expectedShifts.some(s => !presentShifts.has(s));
          if (missingAnyShift) {
            needsReset = true;
          }
        } catch (e) { needsReset = true; }
      } else { needsReset = true; }
      
      if (needsReset) {
        localStorage.removeItem('escala_db_Employee');
        localStorage.removeItem('escala_db_ScheduleEntry');
        // Clear them from sessionStorage too just in case
        try {
          sessionStorage.clear();
        } catch (e) {}
        if (name === 'Employee' || name === 'ScheduleEntry') {
          // Let it fall through to seed the imported data
        } else {
          return JSON.parse(stored);
        }
      } else {
        const parsed = JSON.parse(stored);
        // Automatically remove duplicate employee entries with the same name
        if (name === 'Employee') {
          const uniqueEmployees = [];
          const seenNames = new Set();
          let modified = false;
          
          for (const emp of parsed) {
            if (seenNames.has(emp.name)) {
              modified = true;
              continue; // skip duplicate
            }
            seenNames.add(emp.name);
            uniqueEmployees.push(emp);
          }
          
          if (modified) {
            localStorage.setItem(`escala_db_Employee`, JSON.stringify(uniqueEmployees));
            return uniqueEmployees;
          }
        }

        // Automatically remove duplicate schedule entries with the same employee_name
        if (name === 'ScheduleEntry') {
          const uniqueEntries = [];
          const seenEmployeeNames = new Set();
          let modified = false;
          
          for (const entry of parsed) {
            const trimmedName = entry.employee_name?.trim();
            if (seenEmployeeNames.has(trimmedName)) {
              modified = true;
              continue; // skip duplicate schedule entry
            }
            seenEmployeeNames.add(trimmedName);
            uniqueEntries.push(entry);
          }
          
          if (modified) {
            localStorage.setItem(`escala_db_ScheduleEntry`, JSON.stringify(uniqueEntries));
            return uniqueEntries;
          }
        }

        // Auto-reset AuditLog if it still has the old stale seed employee names
        if (name === 'AuditLog') {
          const staleNames = ['Patrícia Gomes Lima', 'Paula Daniela Maciel'];
          const hasStale = parsed.some(log => staleNames.includes(log.employee_name));
          if (hasStale) {
            // Preserve any user-created logs (id doesn't start with 'log-')
            const userLogs = parsed.filter(log => !log.id.startsWith('log-'));
            const refreshed = [...initialAuditLogs, ...userLogs];
            localStorage.setItem(`escala_db_AuditLog`, JSON.stringify(refreshed));
            return refreshed;
          }
        }

        return parsed;
      }
    } catch (e) {
      console.error(`Failed to parse local db collection ${name}`, e);
    }
  }
  
  // Seed initial data if not found
  let seed = [];
  if (name === 'Employee') {
    const rawSeed = importedEmployees && importedEmployees.length > 0 ? importedEmployees : initialEmployees;
    const unique = [];
    const seen = new Set();
    for (const emp of rawSeed) {
      if (!seen.has(emp.name)) {
        seen.add(emp.name);
        unique.push(emp);
      }
    }
    seed = unique;
  }
  else if (name === 'ScheduleEntry') {
    const rawSeed = importedSchedules && importedSchedules.length > 0 ? importedSchedules : initialSchedules;
    const unique = [];
    const seen = new Set();
    for (const entry of rawSeed) {
      const trimmed = entry.employee_name?.trim();
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        unique.push(entry);
      }
    }
    seed = unique;
  }
  else if (name === 'MedicalCertificate') seed = initialCertificates;
  else if (name === 'AppConfig') seed = initialConfigs;
  else if (name === 'AuditLog') seed = initialAuditLogs;
  
  localStorage.setItem(`escala_db_${name}`, JSON.stringify(seed));
  return seed;
};

// Helper to save collection to localStorage
const saveCollection = (name, data) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`escala_db_${name}`, JSON.stringify(data));
  }
};

// Generic entity actions builder
const createEntityMock = (entityName) => {
  return {
    list: async (sortFieldAndOrder = '', limit = 100) => {
      let list = getCollection(entityName);
      
      // Handle simple sorting by created_date
      if (sortFieldAndOrder.startsWith('-')) {
        const field = sortFieldAndOrder.substring(1);
        list = [...list].sort((a, b) => {
          const valA = a[field] || '';
          const valB = b[field] || '';
          return valB.localeCompare(valA);
        });
      }
      
      return list.slice(0, limit);
    },
    
    filter: async (query = {}) => {
      const list = getCollection(entityName);
      
      // Auto-project schedules for future months if they don't exist yet
      if (entityName === 'ScheduleEntry' && query.month && query.year) {
        const matches = list.filter(item => item.month === query.month && item.year === query.year);
        if (matches.length === 0) {
          console.log(`Generating schedule projection for ${query.month}/${query.year}...`);
          // Use dynamic import to avoid circular dependencies if any
          const { projectScheduleForMonth } = await import('./projection.js');
          const generated = projectScheduleForMonth(query.year, query.month);
          list.push(...generated);
          saveCollection(entityName, list);
          return generated;
        }
      }
      
      return list.filter(item => {
        return Object.entries(query).every(([key, val]) => {
          return item[key] === val;
        });
      });
    },
    
    get: async (id) => {
      const list = getCollection(entityName);
      return list.find(item => item.id === id) || null;
    },
    
    create: async (data) => {
      const list = getCollection(entityName);
      const newItem = {
        id: `${entityName.toLowerCase().substring(0, 3)}_${Math.random().toString(36).substring(2, 9)}`,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ...data
      };
      list.push(newItem);
      saveCollection(entityName, list);
      return newItem;
    },
    
    update: async (id, data) => {
      const list = getCollection(entityName);
      const index = list.findIndex(item => item.id === id);
      if (index === -1) {
        throw new Error(`Record with id ${id} not found in ${entityName}`);
      }
      const updatedItem = {
        ...list[index],
        ...data,
        updated_date: new Date().toISOString()
      };
      list[index] = updatedItem;
      saveCollection(entityName, list);
      return updatedItem;
    },
    
    delete: async (id) => {
      const list = getCollection(entityName);
      const index = list.findIndex(item => item.id === id);
      if (index === -1) {
        throw new Error(`Record with id ${id} not found in ${entityName}`);
      }
      const deletedItem = list[index];
      const filtered = list.filter(item => item.id !== id);
      saveCollection(entityName, filtered);
      return deletedItem;
    }
  };
};

export const db = {
  auth: {
    isAuthenticated: async () => true,
    me: async () => ({
      id: "usr-1",
      name: "Jhon Doe",
      email: "jhon.doe@example.com",
      role: "admin"
    }),
    logout: (redirectUrl) => {
      console.log('Local Db Logout', redirectUrl);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    redirectToLogin: (redirectUrl) => {
      console.log('Local Db Redirect to Login', redirectUrl);
    }
  },
  entities: {
    Employee: createEntityMock('Employee'),
    ScheduleEntry: createEntityMock('ScheduleEntry'),
    MedicalCertificate: createEntityMock('MedicalCertificate'),
    AppConfig: createEntityMock('AppConfig'),
    AuditLog: createEntityMock('AuditLog')
  },
  integrations: {
    Core: {
      UploadFile: async (file) => {
        console.log('Local Db Uploading file', file);
        return {
          file_url: 'https://example.com/mock_uploaded_file.pdf'
        };
      }
    }
  }
};

// Set global __B44_DB__ so that any place using it gets this active local DB!
if (typeof globalThis !== 'undefined') {
  globalThis.__B44_DB__ = db;
}

export default db;
