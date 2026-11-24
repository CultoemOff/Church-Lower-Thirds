**Versão beta para testes — somente Windows.** Programa novo, separado do PTZ Control Web.

### Novidades da beta.2

- **Contribuições além do PIX**: transferência SEPA com QR Code lido pelos aplicativos de banco, link, imagem de QR Code pronta ou dados bancários em texto. Até 6 linhas de dados ao lado do QR Code.
- **Tema global**: cores, fonte, cantos, sombra e opacidade num lugar só; todos os elementos obedecem. Cada elemento pode mudar para "Aparência própria".
- **Assistente de configuração**: abre na primeira vez, explica como o programa funciona e ajuda a deixar tudo pronto. Pode ser aberto de novo na Visão geral.
- **Endereços para o OBS** com botão Copiar na Visão geral e em "OBS e atalhos".

### O que é

Gráficos para o OBS Studio numa única fonte de navegador, controlados por um painel com abas:

- **Nomes** (lower third): 11 modelos. Dá para escrever o nome e a legenda na hora, ou salvar numa lista e mostrar com um clique.
- **QR / Oferta**: cartão com o QR Code da contribuição da igreja ou de qualquer link, com lista de QR Codes salvos. A contribuição pode ser PIX (Brasil), transferência SEPA (zona do euro), um link, a imagem de QR Code que o banco ou o aplicativo gerou, ou só os dados bancários em texto. 5 modelos.
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

1. O instalador pergunta onde deixar a pasta dos seus arquivos (por padrão, `Documentos\Church Lower Thirds`). Escolha um lugar fácil de achar e que entre no seu backup. O programa em si fica em `C:\Program Files\Culto em Off\Church Lower Thirds` (o Windows pede permissão de administrador) e cada usuário do Windows tem a sua própria pasta e as suas próprias configurações.
2. No OBS, adicione uma fonte de Navegador, marque "Arquivo local" e escolha um arquivo da pasta `OBS Sources`: `All Elements.html` (tudo) ou um por elemento (`Names.html`, `Corner Badge.html`, `Ticker.html`, `QR Card.html`, `Schedule.html`, `Social.html`, `Logo.html`). Os arquivos `(Vertical)` são para vídeo 9:16.
3. Dock: menu Docks → Docks de navegador personalizados → `http://127.0.0.1:8795/dock`.

A página "OBS e atalhos" traz o passo a passo, os tamanhos e os endereços para Stream Deck e Companion.

---

**Beta for testing — Windows only.** Names, top bar, scrolling bottom bar, QR / giving card (PIX, SEPA transfer, link, QR image or bank details), weekly schedule, social networks and logo for OBS Studio in one browser source, with a tabbed dock and a separate settings page.

### Atualizações

O painel de configurações avisa quando há versão nova e atualiza com um clique em **Atualizar agora**: baixa, confere o arquivo, instala e volta sozinho, mantendo a pasta e as configurações. No painel do OBS, a engrenagem ganha um ponto laranja quando há atualização.
