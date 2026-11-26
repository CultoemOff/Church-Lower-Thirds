# Church Lower Thirds: notas de desenvolvimento

O que o programa faz, para quem usa, está no [README](../README.md). Aqui fica o que interessa a quem mantém o código. O código é fechado ([licença](../LICENSE.txt)); este repositório é privado e os instaladores saem no repositório público `CultoemOff/Church-Lower-Thirds-Releases`.

## Fontes do OBS

O programa escreve na pasta escolhida na instalação (`Documentos\Church Lower Thirds\OBS Sources`) um arquivo HTML por fonte, com nomes em inglês iguais em todo computador. Cada arquivo só espera o programa e abre o endereço correspondente.

| Arquivo             | Endereço           | Elemento            |
| ------------------- | ------------------ | ------------------- |
| `All Elements.html` | `/source/all`      | todos               |
| `Names.html`        | `/source/names`    | nomes (lower third) |
| `Corner Badge.html` | `/source/badge`    | selo superior       |
| `Ticker.html`       | `/source/ticker`   | barra inferior      |
| `QR Card.html`      | `/source/qr-card`  | cartão QR / oferta  |
| `Schedule.html`     | `/source/schedule` | agenda              |
| `Social.html`       | `/source/social`   | redes sociais       |
| `Logo.html`         | `/source/logo`     | logo                |

Os arquivos `… (Vertical).html` abrem o mesmo endereço com `?layout=vertical` (palco de 1080 × 1920). Painel do OBS: `http://127.0.0.1:8795/dock`. Configurações: `http://127.0.0.1:8795/settings`.

A pasta `Data`, ao lado de `OBS Sources`, guarda `config.json` e as imagens.

## Instalação, usuários e atualização

- O programa fica em `C:\Program Files\Culto em Off\Church Lower Thirds`, ao lado dos outros programas do Culto em Off. Por isso o instalador pede permissão de administrador.
- **Cada usuário do Windows tem os seus arquivos e configurações.** A pasta escolhida no instalador vale para quem está usando o computador naquele momento; os outros usuários recebem `Documentos\Church Lower Thirds` no próprio perfil. O que cada conta usa fica anotado em `%APPDATA%\Church Lower Thirds\location.json` (pasta e porta).
- Com duas contas abertas ao mesmo tempo, a segunda usa a porta seguinte (8796…). Os arquivos de `OBS Sources` e o `Control Dock.html` de cada conta já apontam para a porta certa.
- **Atualização:** o painel consulta as Releases deste repositório e mostra "Atualizar agora". O programa baixa o instalador para a pasta Downloads, confere o SHA-256 com o `SHA256SUMS.txt` da release e abre uma janela por cima de tudo avisando que a versão está pronta; com o OK, o instalador roda em modo silencioso (o Windows pede permissão, na frente) e o programa volta sozinho. Se o Windows recusar, a página mostra onde está o instalador já baixado. Quem usa uma versão final só recebe versões finais; quem usa beta recebe também os betas.

## Segurança

O servidor escuta só em `127.0.0.1` e confere cada pedido (`src/server/guard.ts`): o `Host` tem de ser o do próprio computador, o `Origin` tem de ser uma página do programa e pedidos vindos de outro site (`Sec-Fetch-Site: cross-site`) não chegam à API nem ao WebSocket. Ferramentas que não são navegadores (Stream Deck, Companion) continuam funcionando. Imagens enviadas são conferidas pelo conteúdo e servidas com CSP `sandbox`. A atualização só baixa por HTTPS e confere o SHA-256. Erros vão para `error.log` na pasta de dados do usuário.

## Idiomas

Os textos do código são em português do Brasil. As traduções ficam em `i18n/strings-*.txt` (cinco linhas por texto: pt-BR, inglês, espanhol, italiano, alemão) e `i18n/pt-PT.txt`; `npm run i18n` gera `src/web/js/i18n/*.js`.

## Desenvolvimento

```
npm install
npm run dev        # servidor em http://127.0.0.1:8795
npm test
npm run lint && npm run format:check && npm run typecheck
```

- `src/server`: Express + WebSocket; `pix.ts` (BR Code), `sepa.ts` (QR EPC), `guard.ts` (quem pode falar com o programa), `qr.ts` (QR em SVG), `fonts.ts` (fontes instaladas), `store.ts` (configuração e validação), `updater.ts` (atualização).
- `src/web`: páginas sem bundler (`overlay`, `dock`, `settings`).
- `installer/` e `.github/workflows/installer.yml`: instalador do Windows (Inno Setup) e pacote do macOS (`installer/macos`, `scripts/macos`); os dois são instalados e testados nos runners a cada push. Cada push na `main` publica a versão do `package.json` em Releases; versões com hífen (`0.1.0-beta.1`) saem como pré-lançamento.

Sem instalador, a pasta dos arquivos é `Documentos/Church Lower Thirds` (no macOS, `Filmes/Church Lower Thirds`, porque o macOS protege Documentos contra programas em segundo plano) e pode ser trocada com `--folder <pasta>` ou `CLT_DATA_DIR`.

As marcas citadas pertencem aos seus donos. Este programa não é afiliado ao OBS Project.

## macOS

- O pacote (`Church-Lower-Thirds-macOS-<versão>.pkg`) instala `Church Lower Thirds.app` em `/Applications`, com o Node.js universal (arm64 + x86_64) dentro. O app é só um atalho: abre as configurações no navegador.
- O servidor roda pelo launchd (`~/Library/LaunchAgents/com.cultoemoff.churchlowerthirds.plist` → `run-server.sh`), um por conta do Mac, e volta sozinho se cair. O log fica em `~/Library/Logs/Church Lower Thirds`.
- Notas por conta (`location.json`, `install.json`) em `~/Library/Application Support/Church Lower Thirds`. A atualização baixa o pacote para `~/Library/Caches/Church Lower Thirds` e o abre no Instalador do macOS.
- O pacote não é assinado nem notarizado (não há conta Apple Developer): na primeira instalação o macOS pede "Abrir Mesmo Assim".
- Remover: `sudo "/Applications/Church Lower Thirds.app/Contents/Resources/uninstall.sh"`.

## Publicação

Cada push na `main` publica a versão do `package.json` em Releases deste repositório e, com o secret `RELEASES_TOKEN`, no repositório público de downloads, junto com o README, a licença e as imagens de `docs/media`. É no repositório público que o programa procura atualizações (`src/server/updater.ts`).
