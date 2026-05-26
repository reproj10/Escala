const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

const CONFIG_KEY = 'extra_leaves_unlocked';

export function useScheduleUnlock() {
  const [unlocked, setUnlocked] = useState(false);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    const records = await db.entities.AppConfig.filter({ key: CONFIG_KEY });
    if (records.length > 0) {
      setUnlocked(records[0].value === true);
      setConfigId(records[0].id);
    } else {
      setUnlocked(false);
      setConfigId(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const toggle = async (user) => {
    const newVal = !unlocked;
    if (configId) {
      await db.entities.AppConfig.update(configId, {
        value: newVal,
        updated_by: user?.email || '',
      });
    } else {
      const created = await db.entities.AppConfig.create({
        key: CONFIG_KEY,
        value: newVal,
        updated_by: user?.email || '',
      });
      setConfigId(created.id);
    }
    
    await db.entities.AuditLog.create({
      type: 'scale_unlock',
      description: `${newVal ? 'Destravou' : 'Travou'} a escala para folgas extras`,
      employee_name: user?.name || 'Administrador',
    });

    setUnlocked(newVal);
  };

  return { unlocked, loading, toggle };
}