const fs = require('fs');
const file = 'src/pages/EscalaControl.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the SECTORS METRIC COMPLIANCE CARD from the left column
const startRemove = content.indexOf('{/* SECTORS METRIC COMPLIANCE CARD */}');
const endRemove = content.indexOf('          {/* R. DETAILED ACTIVE SHIFT COMPLIANCE ENGINE & ROSTER */}');

if (startRemove !== -1 && endRemove !== -1) {
  content = content.substring(0, startRemove) + '          </div>\n\n' + content.substring(endRemove);
}

// 2. Insert horizontal buttons above AUDIT STATUS INDICATOR
const auditStart = content.indexOf('{/* AUDIT STATUS INDICATOR */}');
if (auditStart !== -1) {
  const horizontalButtons = `            {/* SHIFT SELECTION BUTTONS (HORIZONTAL) */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                👥 SELECIONE A EQUIPE DE PLANTÃO
              </div>
              <div className="flex flex-wrap gap-2">
                {shifts.map((group) => {
                  const isSelected = activeShiftId === group.id;
                  let dotColor = "bg-emerald-500";
                  if (group.id === "rt_lideranca") dotColor = "bg-red-500";
                  else if (group.id.includes("noturno")) dotColor = "bg-blue-500";
                  
                  return (
                    <button
                      key={group.id}
                      onClick={() => setActiveShiftId(group.id)}
                      className={cn(
                        "flex flex-col items-start p-2.5 rounded-xl border transition-all text-left min-w-[120px] shadow-sm hover:-translate-y-0.5",
                        isSelected 
                          ? "border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 ring-1 ring-blue-500/20" 
                          : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      <span className={cn("text-xs font-bold", isSelected ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300")}>
                        {group.name.replace(/Plantão/g, "").trim()}
                      </span>
                      <span className="text-[9px] flex items-center gap-1.5 mt-1 text-slate-500 font-bold tracking-wider">
                        <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)}></span>
                        Equipe Conforme
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            `;
  content = content.substring(0, auditStart) + horizontalButtons + content.substring(auditStart);
}

// 3. Make calendar col-span-5 instead of 4, and right panel col-span-7 instead of 8 (optional, for better space)
content = content.replace('<div className="lg:col-span-4 space-y-4">', '<div className="lg:col-span-5 space-y-4">');
content = content.replace('<div className="lg:col-span-8 space-y-4">', '<div className="lg:col-span-7 space-y-4">');

fs.writeFileSync(file, content, 'utf8');
console.log("Transformation completed successfully.");
