# UPA Zilda Arns — Escala de Enfermagem

Este projeto é um sistema moderno de gerenciamento e visualização da Escala de Enfermagem Diária para a **UPA Zilda Arns** (Embu das Artes - SP). 

Ele permite o controle de turnos (Diurno A/B, Noturno A/B), gerenciamento de atestados médicos, licenças/afastamentos, visualização de estatísticas, importação de dados e geração de relatórios de plantões.

---

## 🚀 Como Rodar o Projeto Localmente

Siga os passos abaixo para executar a aplicação no seu computador:

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em seu sistema.

### Passo a Passo

1. **Instalar as dependências**:
   ```bash
   npm install
   ```

2. **Iniciar o servidor local**:
   ```bash
   npm run dev
   ```

3. **Acessar a aplicação**:
   Abra o navegador no endereço exibido no terminal (geralmente `http://localhost:5173`).

---

## 🛠️ Tecnologias Utilizadas

* **React** (v18)
* **Vite** (para bundling super-rápido)
* **Tailwind CSS** & **Radix UI** (estilização moderna e componentes acessíveis)
* **Framer Motion** (micro-animações suaves)
* **Lucide React** (biblioteca de ícones elegantes)
* **Recharts** (gráficos de distribuição e plantões)
* **LocalStorage DB** (banco de dados em cache no próprio navegador para funcionamento autônomo sem dependências externas)

---

## 📂 Organização do Projeto

* `src/api/dbClient.js`: Cliente de banco de dados mock que gerencia a persistência no `localStorage`.
* `src/pages/`: Páginas do sistema (Dashboard, Schedule, Certificates, Management, etc.).
* `src/components/`: Componentes visuais reutilizáveis (tabelas de escalas, formulários, cartões de estatísticas).
* `src/lib/AuthContext.jsx`: Gerenciamento de estado de autenticação simplificado para a web.

---

## 🌐 Publicação na Web

Este aplicativo é estático e **100% pronto para a web** (Serverless). Você pode publicá-lo gratuitamente em qualquer uma destas plataformas populares:
* **Vercel**
* **Netlify**
* **GitHub Pages**

Qualquer alteração ou novo registro feito por cada usuário na tela ficará salvo de forma privada e segura diretamente no navegador de quem está utilizando!
