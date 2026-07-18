# Deploy no Coolify

Este projeto roda como um unico servico Docker:

- o Vite compila o frontend durante o build;
- o Express serve a API e o frontend compilado;
- as chamadas do frontend usam caminhos relativos em `/api`;
- o SQLite e persistido em um volume separado.

## Configuracao da aplicacao

| Campo | Valor |
|---|---|
| Build Pack | `Dockerfile` |
| Base Directory | `/` |
| Dockerfile Location | `/Dockerfile` |
| Ports Exposes | `3001` |
| Branch | `main` |

Nao use a opcao "Dockerfile sem Git". O arquivo ja esta na raiz do repositorio.

## Variaveis de ambiente

```env
PORT=3001
SYNC_INTERVAL=300000
NBA_SITE_API_URL=https://site.api.espn.com/apis/site/v2/sports/basketball/nba
NBA_CORE_API_URL=https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba
NFL_API_URL=https://site.api.espn.com/apis/site/v2/sports/football/nfl
```

Nao sao necessarias chaves privadas para essas APIs publicas.

## Armazenamento persistente

Configure um volume no destino:

```text
/app/backend/db
```

Esse volume preserva `sports.db`, times, jogos, classificacoes e logs de
sincronizacao entre reinicios e novos deploys.

## Dominio local

Um endereco `sslip.io` pode apontar para o IP da rede local:

```text
http://nome-do-app.192.168.15.112.sslip.io
```

Esse endereco nao e publico. Ele funciona somente para clientes com acesso a
rede local.

## Acesso publico

O Tailscale Funnel encaminha HTTPS para a porta local:

```bash
sudo tailscale funnel --bg http://127.0.0.1:3001
tailscale funnel status
```

O Funnel e independente do proxy do Coolify e deve ser validado depois de
reinicios ou alteracoes de hostname.

## Sincronizacao

Nao existe painel Admin. O backend:

1. inicializa o banco;
2. executa uma sincronizacao inicial;
3. repete a sincronizacao conforme `SYNC_INTERVAL`;
4. atualiza jogos, times e classificacoes.

O valor recomendado `300000` equivale a cinco minutos.

## Deploy

1. Envie e teste as alteracoes no repositorio.
2. Abra a aplicacao no Coolify.
3. Confirme a branch `main`.
4. Clique em `Redeploy`.
5. Acompanhe o build em `Deployments`.
6. Verifique os logs de inicializacao.

## Verificacao pos-deploy

```bash
curl http://127.0.0.1:3001/api/health
curl "http://127.0.0.1:3001/api/games/upcoming?league=NFL"
curl -I https://nflnba.tail08f125.ts.net/
```

Teste tambem:

- `/nba`
- `/nfl`
- `/live`
- `/standings`

Valide em uma tela de computador e em uma tela de ate `640px`.

## Reinicio automatico

O Docker e o proxy do Coolify devem estar habilitados no boot. O container deve
usar uma politica de reinicio adequada, como `unless-stopped`.

Depois de reiniciar a maquina, confirme:

```bash
docker ps
curl http://127.0.0.1:3001/api/health
tailscale status
tailscale funnel status
```

## Problemas comuns

### Site abre localmente, mas nao publicamente

- confirme `tailscaled`;
- confira `tailscale funnel status`;
- teste `127.0.0.1:3001`;
- confirme que o hostname Tailscale nao mudou.

### Dados desaparecem depois do deploy

- confira se o volume esta montado em `/app/backend/db`;
- nao grave o banco apenas na camada interna da imagem.

### Build usa codigo antigo

- confirme a branch e o commit mostrados no deployment;
- execute `Redeploy`, nao apenas `Restart`;
- verifique se o Coolify esta usando a imagem criada pelo Dockerfile atual.

### Aplicacao inicia, mas nao sincroniza

- confira os logs do container;
- valide as URLs das APIs;
- teste conectividade de saida do servidor;
- confira `SYNC_INTERVAL`.
