**Versão beta para testes — somente Windows.** Programa novo, separado do PTZ Control Web.

### Novidades da beta.9

- **Perfis de culto**: cada perfil ("Culto padrão", "Culto de mulheres", "Natal"…) guarda uma aparência completa (modelo, cores, fontes, logo, posições, o que o selo mostra). Troca-se de perfil no alto das configurações, no cartão "Perfis de culto" do Tema global, no painel do OBS ou por endereço (`/api/profile/use?name=Natal`, para Stream Deck). Os nomes, avisos, agenda e contribuições são os mesmos em todos os perfis.
- **Painel do OBS**: a prévia saiu; no lugar dela fica a escolha do perfil.
- **Painel do OBS, correção**: não dava para digitar nos campos que aceitam Enter (nome e legenda, recado do selo e da barra, rede social): cada tecla era cancelada. Agora dá.
- **Tempo na tela**: o seletor do painel mostra "Tempo: 10 s" (antes aparecia só "Fica") e as instalações novas começam com 10 segundos. Quem já usa o programa mantém o que estava escolhido.
- **Modelos**: as miniaturas ficam paradas; a animação de entrada aparece na prévia grande quando um modelo é escolhido.

### Novidades da beta.8

- **Atualizar agora**: em alguns computadores (principalmente os de empresa) o Windows recusava abrir o instalador e aparecia só "spawn UNKNOWN". Agora, se a primeira tentativa falha, o programa pede ao Windows para abrir o instalador com permissão de administrador; se nem assim der, mostra o motivo e o botão **Baixar o instalador**.

### Novidades da beta.7

- **Modelo temático "Natal no Egito"**, para a cantata: placas em tons de areia e marrom com o **logo completo** (o sol, as pirâmides, o letreiro e a linha "Cantata ICT 2026", com os traços e as cores da arte) na placa do nome e no cartão do QR Code; no selo superior e nas redes ficam o sol e as pirâmides. Cores sugeridas "Deserto"; há também "Noite no deserto".
- A fonte do letreiro é a **Khepri**, que é comercial e por isso não vem com o programa. Se ela estiver instalada no computador, o modelo usa a Khepri nos nomes e textos; se não estiver, usa a Cinzel.
- **Selo superior: data e dia da semana**, cada um com a sua opção, junto com o horário ou sozinhos, em três formatos (curta, por extenso, em números). O painel do OBS ganhou o botão "Data".
- Instalador: a atualização deixa de usar o "Restart Manager" do Windows para fechar o programa (ele já é fechado pelo próprio instalador).

### Novidades da beta.6

- **Tema global em três passos**: primeiro o **modelo** (formato, fonte e animação de todos os elementos), depois as **cores prontas** (o modelo já aplica a que mais combina, e ela fica marcada como sugerida) e por fim o ajuste de cada cor. São 23 modelos e 27 conjuntos de cores.
- **Miniaturas reais dos modelos**: cada figura é o próprio gráfico (selo, nome, cartão do QR Code e barra) desenhado com aquele modelo, com o nome e o logo da igreja. Passe o mouse para ver a animação de entrada.
- **Modelos temáticos**, numa categoria própria: **Jovem**, **Kids**, **Feminino**, **Coral**, **Banda**, **Natal** e **Páscoa** (sóbrios) e **Natal Kids** e **Páscoa Kids** (infantis). Cada um traz o seu desenho: flores, estrelas, notas musicais, barras de som e, nas datas, símbolos cristãos: a estrela de Belém e a manjedoura no Natal, os lírios, a cruz e o túmulo vazio na Páscoa. O desenho pode ser trocado em "Fonte e forma".
- Três formatos novos para nomes, selo superior, cartão do QR Code e redes: **Urbano** (blocos com corte inclinado e etiqueta), **Adesivo** (borda branca e balão, fonte Fredoka) e **Delicado** (placa suave com moldura fina).
- **Três animações novas**: gota d'água (a do vidro líquido), linha que se abre e deslize com rastro.
- **Assistente**: no passo Aparência os botões Voltar, Pular e Avançar voltaram a aparecer; a lista de modelos rola dentro da janela.

### Novidades da beta.5

- **Ícone novo**, da mesma família do PTZ Control Web: fundo azul com a cruz e, no terço inferior, a tarja de nome com o fio dourado. Vale para o instalador, os atalhos e as abas do navegador.

### Novidades da beta.4

- O repositório passou a ser público: o botão **Atualizar agora** encontra as versões novas em qualquer computador.
- Nome exibido como "Church Lower Thirds by Culto em Off" nas janelas.

### Novidades da beta.3

- **Modelo "Placa"** para nomes, cartão do QR Code e redes: placa escura com borda fina, quadro para o ícone ou o logo e fio na cor de destaque. No cartão, o QR Code sai na cor escura da própria placa.
- **Redes em sequência**: o botão "Todos em sequência" do painel mostra um item de cada vez, com contador (01 / 03) e linha do tempo. Cada item pode ter a própria frase, e há ícones para endereço, telefone e e-mail.
- **Tema "Azul e ouro"**: azul-marinho com dourado, cartão do QR no alto à esquerda e as placas embaixo à esquerda. Também entrou em "Cores prontas".
- O modelo "Vidro líquido" dos nomes voltou a aparecer na lista de modelos.

### Novidades da beta.2

- **Contribuições além do PIX**: aplicativo de pagamento por telefone ou código (o nome é livre; em Portugal, Espanha e Itália já vem sugerido o mais usado no país), transferência SEPA com QR Code lido pelos aplicativos de banco, link, imagem de QR Code pronta ou só os dados bancários. Até 6 linhas de dados ao lado do QR Code.
- **Tema global**: cores, fonte, cantos, sombra e opacidade num lugar só; todos os elementos obedecem e cada um pode mudar para "Aparência própria". **14 temas prontos** numa galeria que mostra cada um.
- **Assistente de configuração** com tutorial ilustrado do OBS: abre na primeira vez, pode ser pulado inteiro ou passo a passo e reaberto na Visão geral.
- **Endereços para o OBS** com botão Copiar, o do painel primeiro. "OBS e atalhos" e "Backup" ficam no canto direito.
- **Painel do OBS**: botão de fixar (o que estiver na tela não sai quando o tempo acaba) e prévia do elemento da aba.
- **Backup**: "Restaurar as configurações iniciais", com aviso, reabre o assistente.
- **Segurança e erros**: o programa só responde às próprias páginas (sites abertos no navegador não conseguem ler as configurações nem mexer no que está no ar); arquivo de configurações danificado é guardado à parte em vez de ser sobrescrito; os erros ficam em `error.log`, na pasta de dados do usuário.

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
