# ⚡ Fúria Voleibol — Landing Page & Calendário de Jogos

Landing page oficial e plataforma de divulgação de jogos do grupo **Fúria Voleibol**.

> *"Organização, Respeito, Evolução e Bons jogos. Esse é o nosso Espírito! ⚡ Jogue com intensidade e evolua em comunidade!"*

---

## ✨ Funcionalidades Principais

- **Hero Section com Vídeo em Background**: Vídeo *indoor* em reprodução contínua (`public/video/indoor.mp4`), efeito *glitch* no título principal, cursor personalizado em formato de raio e brilho dinâmico no ponteiro.
- **Identidade Visual Glassmorphism**: Paleta em azul profundo (`#010C2C`) e roxo neon (`#9407F2` / `#C00BFD`) com cartões translúcidos, divisórias em neon e animações de revelação ao fazer *scroll*.
- **Calendário Dinâmico de Jogos (Supabase)**:
  - **Visão de Visitante**: Lista interativa de jogos e treinos com filtros rápidos por período (`Mês`, `Semana`, `Próximos`) e por categoria (`Todos`, `Misto`, `Masculino`, `Feminino`), além de links diretos para o Google Maps e inscrição externa.
  - **Painel & Editor Visual Administrativo**: Acesso restrito via `login.html` com Supabase Auth, permitindo vistas **Mensal**, **Semanal** e **Diária**, criação rápida de jogos por dia (`+`), séries recorrentes (`Único`, `Diário`, `Semanal`, `Quinzenal`, `Mensal`), edição/duplicação/exclusão em lote e reagendamento via **Drag & Drop**.
- **Segurança & Banco de Dados (PostgreSQL + RLS)**:
  - Políticas de **Row Level Security (RLS)** forçadas na tabela `public.games` (leitura pública; escrita restrita a administradores validados por função `SECURITY DEFINER`).
  - Proteção contra força bruta no login (`LoginSecurityGuard`), campo *honeypot* anti-bot, monitor de inatividade (30 minutos) e *bridge* de sessão entre páginas.
- **Nossa Quadra (Google Maps)**: Mapa incorporado com redirecionamento direto ao clicar para a localização oficial no Google Maps.
- **Quero Conhecer (WhatsApp)**: Chamada direta para contacto com o grupo via WhatsApp.
- **Fale Conosco (Netlify Forms)**: Formulário integrado ao Netlify Forms com proteção *honeypot* e página personalizada de confirmação (`sucesso.html`).
- **Design 100% Responsivo**: Layout adaptado para desktop e dispositivos móveis com menu *hamburger* deslizante.

---

## 📁 Estrutura do Projeto

```text
furia/
├── index.html            # Landing page principal, calendário e modais do editor visual
├── login.html            # Portal de autenticação administrativa
├── sucesso.html          # Página de confirmação de envio do formulário de contacto
├── style.css             # Folha de estilos principal (tema, glassmorphism, calendário e responsivo)
├── script.js             # Cursor glow, revelação no scroll, navbar dinâmica e menu mobile
├── calendar.js           # Motor do calendário interativo, filtros, recorrências e Drag & Drop
├── supabase-config.js    # Cliente Supabase, gestão de sessão, segurança de login e CRUD de jogos
├── supabase_schema.sql   # Schema SQL completo, whitelist de admins, auditoria e políticas RLS
└── public/
    ├── img/
    │   ├── furia_logo.png  # Logótipo oficial e favicon
    │   └── hero_bg.jpg     # Imagem de apoio / poster da Hero Section
    └── video/
        └── indoor.mp4      # Vídeo de fundo da Hero Section
```

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+)
- **Backend / Base de Dados / Auth**: [Supabase](https://supabase.com/) (`@supabase/supabase-js` v2, PostgreSQL, Row Level Security)
- **Formulários & Hospedagem**: [Netlify Forms](https://www.netlify.com/products/forms/)
- **Ícones & Tipografia**: Font Awesome 6.4.0 e Google Fonts (`Montserrat` e `Outfit`)

---

## 🚀 Como Executar Localmente

Como o projeto é estático (HTML/CSS/JS puro conectado ao Supabase via CDN), basta servi-lo através de qualquer servidor HTTP local:

```bash
# Clonar o repositório
git clone https://github.com/felpsmarinho/furia.git
cd furia

# Iniciar um servidor local com Python
python -m http.server 8000
```

Em seguida, aceda a `http://localhost:8000` no navegador.

### Configuração do Supabase

1. Crie um projeto no Supabase e execute o script [`supabase_schema.sql`](./supabase_schema.sql) no **SQL Editor** para criar o schema `private`, a tabela `public.games` e as políticas RLS.
2. Registe os dados do seu projeto (`url` e `publishableKey`) em [`supabase-config.js`](./supabase-config.js).
3. Para deploy em produção com captura do formulário de contacto, publique o repositório diretamente na **Netlify**.

---

## 📞 Contactos Oficiais

- **Instagram**: [@furiavoleibol_](https://www.instagram.com/furiavoleibol_/)
- **WhatsApp**: [+351 911 977 113](https://wa.me/351911977113)
- **Localização**: [Abrir no Google Maps](https://maps.app.goo.gl/zPJi8qNHqg8oz5Pc7)
- **E-mail**: `adm@furiavoleibol.pt`
