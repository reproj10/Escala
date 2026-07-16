const fs = require('fs');
const file = 'src/pages/EscalaControl.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Change default selectedDay from 24 to new Date().getDate()
content = content.replace(
  'const [selectedDay, setSelectedDay] = useState<number>(24);',
  'const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());'
);

// Fix 2: Use absence_status for statusForDay
const oldStatusLogic = 'const statusForDay = (member.days && member.days[String(selectedDay)]) || (member.status === "working" ? "P" : "F");';
const newStatusLogic = 'const statusForDay = (member.days && member.days[String(selectedDay)]) || (member.absence_status && member.absence_status !== "none" ? member.absence_status : (member.status === "working" ? "P" : "F"));';
content = content.replace(oldStatusLogic, newStatusLogic);

// We should also replace the OTHER occurrence of this logic just in case it exists.
const oldStatusLogic2 = 'const statusForDay = (m.days && m.days[String(selectedDay)]) || (m.status === "working" ? "P" : "F");';
const newStatusLogic2 = 'const statusForDay = (m.days && m.days[String(selectedDay)]) || (m.absence_status && m.absence_status !== "none" ? m.absence_status : (m.status === "working" ? "P" : "F"));';
content = content.replace(oldStatusLogic2, newStatusLogic2);

fs.writeFileSync(file, content, 'utf8');
console.log("Fixes applied.");
