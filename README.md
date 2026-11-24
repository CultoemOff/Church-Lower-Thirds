# Church Lower Thirds — by Culto em Off

**Free lower thirds & overlays for church live streams in OBS Studio.**

Lower thirds e overlays para o OBS Studio, numa única fonte de navegador. Programa separado do PTZ Control Web. **Versão beta, somente Windows.**

## O que tem

- **Nomes** (lower third): 11 modelos; texto escrito na hora ou salvo numa lista; logo e QR Code opcionais em cada item.
- **Selo superior**: 4 modelos, num canto da tela, com logo, nome da igreja, "AO VIVO", horário e recados; cada parte é opcional.
- **Barra inferior**: 4 modelos, com texto rolando o tempo todo. Os nomes sobem sozinhos quando ela está no ar.
- **Cartão QR / Oferta**: 5 modelos. A contribuição da igreja pode ser PIX (BR Code estático pela chave, ou o "copia e cola" do banco), transferência SEPA (QR EPC), um link, uma imagem de QR Code enviada ou só os dados bancários; QR Code de qualquer link.
- **Tema global**: cores, fonte e forma que todos os elementos seguem; cada elemento pode ter aparência própria.
- **Assistente de configuração** com tutorial ilustrado do OBS na primeira execução e endereços do OBS com botão de copiar.
- **Painel do OBS**: fixar um elemento (ignora o tempo global) e prévia do elemento da aba.

## Segurança

O servidor escuta só em `127.0.0.1` e confere cada pedido (`src/server/guard.ts`): o `Host` tem de ser o do próprio computador, o `Origin` tem de ser uma página do programa e pedidos vindos de outro site (`Sec-Fetch-Site: cross-site`) não chegam à API nem ao WebSocket. Ferramentas que não são navegadores (Stream Deck, Companion) continuam funcionando. Imagens enviadas são conferidas pelo conteúdo e servidas com CSP `sandbox`. A atualização só baixa por HTTPS e confere o SHA-256. Erros vão para `error.log` na pasta de dados do usuário.
- **Agenda**: 4 modelos; mostra um dia por vez e sai depois do último.
- **Redes sociais**: 3 modelos, com ícones genéricos (não os logotipos das redes) ou imagem enviada pela igreja.
- **Logo** no canto da tela.
- Temas completos, cores com degradê, 18 fontes incluídas (`src/web/fonts`, licença SIL OFL 1.1) e todas as instaladas no computador, 8 animações, sombras e transparência.
- **Painel** com abas para o dock do OBS, responsivo (alto e estreito ou largo e baixo), com o tempo na tela. As configurações avançadas ficam numa página à parte, com prévia ao vivo.
- Endereços HTTP para Stream Deck e Companion, sem plugin. Backup num arquivo.

## Fontes do OBS

O programa escreve na pasta escolhida na instalação (`Documentos\Church Lower Thirds\OBS Sources`) um arquivo HTML por fonte, com nomes em inglês iguais em todo computador. Cada arquivo só espera o programa e abre o endereço correspondente:

| Arquivo | Endereço | Elemento |
|---|---|---|
| `All Elements.html` | `/source/all` | todos |
| `Names.html` | `/source/names` | nomes (lower third) |
| `Corner Badge.html` | `/source/badge` | selo superior |
| `Ticker.html` | `/source/ticker` | barra inferior |
| `QR Card.html` | `/source/qr-card` | cartão QR / oferta |
| `Schedule.html` | `/source/schedule` | agenda |
| `Social.html` | `/source/social` | redes sociais |
| `Logo.html` | `/source/logo` | logo |

Os arquivos `… (Vertical).html` abrem o mesmo endereço com `?layout=vertical` (palco de 1080 × 1920). Painel do OBS: `http://127.0.0.1:8795/dock`. Administração: `http://127.0.0.1:8795/settings`.

A pasta `Data`, ao lado de `OBS Sources`, guarda `config.json` e as imagens.

## Idiomas

Os textos do código são em português do Brasil. As traduções ficam em `i18n/strings-*.txt` (cinco linhas por texto: pt-BR, inglês, espanhol, italiano, alemão) e `i18n/pt-PT.txt`; `npm run i18n` gera `src/web/js/i18n/*.js`.

## Desenvolvimento

```
npm install
npm run dev        # servidor em http://127.0.0.1:8795
npm test
npm run lint && npm run format:check && npm run typecheck
```

- `src/server`: Express + WebSocket; `pix.ts` (BR Code), `sepa.ts` (QR EPC), `guard.ts` (quem pode falar com o programa), `qr.ts` (QR em SVG), `fonts.ts` (fontes instaladas), `store.ts` (configuração e validação).
- `src/web`: páginas sem bundler (`overlay`, `dock`, `settings`).
- `installer/` e `.github/workflows/installer.yml`: instalador do Windows (Inno Setup). Cada push na `main` publica a versão do `package.json` em Releases; versões com hífen (`0.1.0-beta.1`) saem como pré-lançamento.

## Instalação, usuários e atualização

- O programa fica em `C:\Program Files\Culto em Off\Church Lower Thirds`, ao lado dos outros programas do Culto em Off (cada um na sua subpasta). Por isso o instalador pede permissão de administrador.
- **Cada usuário do Windows tem os seus arquivos e configurações.** A pasta escolhida no instalador vale para quem está usando o computador naquele momento; os outros usuários recebem `Documentos\Church Lower Thirds` no próprio perfil. O que cada conta usa fica anotado em `%APPDATA%\Church Lower Thirds\location.json` (pasta e porta).
- Com duas contas abertas ao mesmo tempo, a segunda usa a porta seguinte (8796…). Os arquivos de `OBS Sources` e o `Control Dock.html` de cada conta já apontam para a porta certa.
- **Atualização:** o painel consulta as Releases deste repositório e mostra "Atualizar agora". O programa baixa o instalador, confere o SHA-256 com o `SHA256SUMS.txt` da release, executa em modo silencioso (o Windows pede permissão) e volta sozinho. Quem usa uma versão final só recebe versões finais; quem usa beta recebe também os betas. As Releases precisam ser públicas para a consulta funcionar.

Sem instalador (desenvolvimento), a pasta dos arquivos é `Documentos/Church Lower Thirds` e pode ser trocada com `--folder <pasta>` ou `CLT_DATA_DIR`.

As marcas citadas pertencem aos seus donos. Este programa não é afiliado ao OBS Project.
