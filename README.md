# Lower Third Web — by Culto em Off

Lower thirds e overlays para o OBS Studio, numa única fonte de navegador. Programa separado do PTZ Control Web. **Versão beta, somente Windows.**

## O que tem

- **Nomes** (lower third): 11 modelos; texto escrito na hora ou salvo numa lista; logo e QR Code opcionais em cada item.
- **Selo superior**: 4 modelos, num canto da tela, com logo, nome da igreja, "AO VIVO", horário e recados; cada parte é opcional.
- **Barra inferior**: 4 modelos, com texto rolando o tempo todo. Os nomes sobem sozinhos quando ela está no ar.
- **Cartão QR / PIX**: 5 modelos. PIX pela chave da igreja (BR Code estático) ou pelo "copia e cola" do banco; QR Code de qualquer link.
- **Agenda**: 4 modelos; mostra um dia por vez e sai depois do último.
- **Redes sociais**: 3 modelos, com ícones genéricos (não os logotipos das redes) ou imagem enviada pela igreja.
- **Logo** no canto da tela.
- Temas completos, cores com degradê, 18 fontes incluídas (`src/web/fonts`, licença SIL OFL 1.1) e todas as instaladas no computador, 8 animações, sombras e transparência.
- **Painel** com abas para o dock do OBS, responsivo (alto e estreito ou largo e baixo), com o tempo na tela. As configurações avançadas ficam numa página à parte, com prévia ao vivo.
- Endereços HTTP para Stream Deck e Companion, sem plugin. Backup num arquivo.

## Fontes do OBS

O programa escreve na pasta escolhida na instalação (`Documentos\Lower Third Web\OBS Sources`) um arquivo HTML por fonte, com nomes em inglês iguais em todo computador. Cada arquivo só espera o programa e abre o endereço correspondente:

| Arquivo | Endereço | Elemento |
|---|---|---|
| `All Elements.html` | `/source/all` | todos |
| `Names.html` | `/source/names` | nomes (lower third) |
| `Corner Badge.html` | `/source/badge` | selo superior |
| `Ticker.html` | `/source/ticker` | barra inferior |
| `QR Card.html` | `/source/qr-card` | cartão QR / PIX |
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

- `src/server`: Express + WebSocket; `pix.ts` (BR Code), `qr.ts` (QR em SVG), `fonts.ts` (fontes instaladas), `store.ts` (configuração e validação).
- `src/web`: páginas sem bundler (`overlay`, `dock`, `settings`).
- `installer/` e `.github/workflows/installer.yml`: instalador do Windows (Inno Setup). Cada push na `main` publica a versão do `package.json` em Releases; versões com hífen (`0.1.0-beta.1`) saem como pré-lançamento.

Sem instalador (desenvolvimento), os dados ficam em `%APPDATA%\Lower Third Web`.

As marcas citadas pertencem aos seus donos. Este programa não é afiliado ao OBS Project.
