# Lower Third Web — by Culto em Off

Lower thirds e overlays para o OBS Studio, numa única fonte de navegador. Programa separado do PTZ Control Web. **Versão beta, somente Windows.**

## O que tem

- **Lower third**: 10 modelos, nome e cargo, logo da igreja e QR Code (PIX ou link) em cada item.
- **Barra superior**: 6 modelos, com logo, nome da igreja, relógio, data, recados que se revezam (na sequência ou aleatórios) e QR Code.
- **Cartão QR / PIX**: 4 modelos. O QR do PIX é gerado pela chave da igreja (BR Code estático) ou pelo "PIX copia e cola" do banco.
- **Logo** no canto da tela.
- Cores com degradê, qualquer fonte instalada no computador, 8 animações, 3 tipos de sombra, transparência, cantos, tamanho e posição.
- **Painel pequeno** para o dock do OBS. As configurações ficam numa página à parte, aberta no navegador, com prévia ao vivo.
- Endereços HTTP para Stream Deck e Companion, sem plugin.
- Backup de tudo (configurações, nomes e logo) num arquivo.

## Endereços

| O quê | Endereço |
|---|---|
| Fonte de navegador do OBS (1920 × 1080) | `http://127.0.0.1:8795/overlay` |
| Dock do OBS | `http://127.0.0.1:8795/dock` |
| Configurações | `http://127.0.0.1:8795/settings` |

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

Os dados ficam em `%APPDATA%\Lower Third Web`.

As marcas citadas pertencem aos seus donos. Este programa não é afiliado ao OBS Project.
