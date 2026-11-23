**Versão beta para testes — somente Windows.** Programa novo, separado do PTZ Control Web.

### O que é

Gráficos para o OBS Studio numa única fonte de navegador, controlados por um painel com abas:

- **Nomes** (lower third): 11 modelos. Dá para escrever o nome e a legenda na hora, ou salvar numa lista e mostrar com um clique.
- **QR / PIX**: cartão com o QR Code do PIX da igreja ou de qualquer link, com lista de QR Codes salvos. 5 modelos.
- **Superior**: selo num canto da tela com logo, nome da igreja, "AO VIVO", horário e recados; cada parte liga e desliga sozinha. 4 modelos.
- **Inferior**: barra com texto rolando o tempo todo. 4 modelos.
- **Agenda**: dias e horários dos cultos, um dia de cada vez, saindo depois do último. 4 modelos.
- **Redes**: "Siga-nos no Instagram" e o @, com um clique. 3 modelos.
- **Logo** no canto da tela.
- **Tempo na tela** único, escolhido no próprio painel.
- **Posições na tela**: arraste cada elemento para onde quiser e redimensione pelo canto.
- **Uma fonte por elemento** ou uma com todos (`/overlay?only=lower`, `top`, `ticker`, `card`, `agenda`, `social`, `bug`).
- Dois temas completos (Céu noturno e Vidro líquido), cores com degradê, 18 fontes gratuitas incluídas e todas as fontes instaladas no PC, 8 animações, sombras e transparência.
- As configurações avançadas abrem numa página à parte no navegador, com prévia ao vivo.

- **Idiomas**: português (Brasil e Portugal), espanhol, inglês, italiano e alemão, nos painéis e no instalador.
- **Fonte vertical** (9:16) para Shorts, Reels e TikTok, com posições próprias, e escolha das resoluções mais comuns.
- **Página de administração** com menu lateral, visão geral do que está no ar e primeiros passos.

### Como instalar no OBS

1. O instalador pergunta onde deixar a pasta dos seus arquivos (por padrão, `Documentos\Lower Third Web`). Escolha um lugar fácil de achar e que entre no seu backup.
2. No OBS, adicione uma fonte de Navegador, marque "Arquivo local" e escolha um arquivo da pasta `OBS Sources`: `All Elements.html` (tudo) ou um por elemento (`Names.html`, `Corner Badge.html`, `Ticker.html`, `QR Card.html`, `Schedule.html`, `Social.html`, `Logo.html`). Os arquivos `(Vertical)` são para vídeo 9:16.
3. Dock: menu Docks → Docks de navegador personalizados → `http://127.0.0.1:8795/dock`.

A página "OBS e atalhos" traz o passo a passo, os tamanhos e os endereços para Stream Deck e Companion.

---

**Beta for testing — Windows only.** Names, top bar, scrolling bottom bar, PIX/QR card, weekly schedule, social networks and logo for OBS Studio in one browser source, with a tabbed dock and a separate settings page.
