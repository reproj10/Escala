import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

export const isIframe = window.self !== window.top;

export function formatName(name) {
  if (!name) return '';
  const lowercasedWords = ['de', 'da', 'do', 'das', 'dos', 'e'];
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index, arr) => {
      if (!word) return '';
      // Sempre capitaliza a primeira e a última palavra, além das palavras que não estão na lista de exceções
      if (index === 0 || index === arr.length - 1 || !lowercasedWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

export function formatPhone(value) {
  if (!value) return '';
  
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);

  if (v.length === 0) return '';
  if (v.length <= 2) return `(${v}`;
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}

export function formatCPF(value) {
  if (!value) return '';
  let v = value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  
  if (v.length <= 3) return v;
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
}

export function validateCPF(cpf) {
  if (!cpf) return false;
  const strCPF = cpf.replace(/[^\d]+/g, '');
  if (strCPF.length !== 11) return false;
  
  // Verify if all digits are the same
  if (/^(\d)\1+$/.test(strCPF)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;

  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(strCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;

  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(strCPF.substring(10, 11))) return false;

  return true;
}

export function getCurrentMonthYearString() {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export function getCurrentMonthString() {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const now = new Date();
  return months[now.getMonth()];
}
