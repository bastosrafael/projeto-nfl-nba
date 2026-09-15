# Changelog

Todas as mudanças importantes deste projeto serão documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

---

## v1.0.0 - Primeira versão estável

**Data:** 15/09/2026

### Adicionado

- Dashboard principal NFL + NBA.
- Integração com jogos NBA e NFL.
- Visualização de:
  - próximos jogos
  - jogos do dia
  - jogos ao vivo
  - resultados
  - classificação.
- Logos dos times NBA e NFL.
- Componente reutilizável `TeamLogo`.
- Fallback de logos com iniciais quando necessário.
- Glossário de estatísticas NFL.

### Melhorado

- Layout responsivo para celular.
- Cards de jogos adaptados para mobile.
- Classificação transformada em cards no celular.
- Menu mobile com melhor navegação.
- Cards de resumo do dashboard compactados.
- Melhor distribuição visual dos confrontos.

### Corrigido

- Erro "Not Found" ao atualizar rotas do React Router no Render.
- Carregamento inicial dos jogos NBA no dashboard.
- Alinhamento dos confrontos mobile.
- Posicionamento do VS entre os times.
- Separadores incorretos "X" substituídos por "VS".
- Problemas de logos ausentes através de aliases de times.
- Ajustes de espaçamento e responsividade.

---

## render-config

Marco técnico.

### Alterado

- Configuração inicial do frontend para consumir backend hospedado no Render.
- Ajustes necessários para ambiente publicado.

---

## Próximas versões

### v1.1.0

**Planejado:**

- novas funcionalidades
- melhorias de experiência
- novos dados esportivos
