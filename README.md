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

## Endereços

| O quê | Endereço |
|---|---|
| Fonte de navegador do OBS (1920 × 1080), todos os elementos | `http://127.0.0.1:8795/overlay` |
| Fonte de um elemento só (`lower`, `top`, `ticker`, `card`, `agenda`, `social`, `bug`) | `http://127.0.0.1:8795/overlay?only=lower` |
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
