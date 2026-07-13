# Aura - Roadmap & TODO

Este documento lista as funcionalidades planeadas para o Aura, focadas em melhorar a capacidade de *debugging*, análise e manipulação da interação entre o IDE (onde corre o agente AI) e o servidor local do Llama.cpp.

## 🛠️ 1. Debugging de Pedidos e Respostas
- [ ] **1.** **"Replay" & Playground Interativo:** A capacidade de pegar num pedido intercetado no painel Network Logs e, com um clique, abri-lo num separador de Playground. Aí poderias alterar a temperatura, reescrever parte do prompt e enviá-lo novamente ao servidor Llama manualmente para ver se uma pequena afinação resolvia a alucinação do modelo, sem precisares de voltar a desencadear toda a ação no IDE.
- [ ] **2.** **Validação Estrutural e Breakpoints (JSON Validator):** Como o IDE espera muitas vezes JSON, se o modelo alucinar na formatação o IDE "encrava". Esta *feature* divide-se em várias vertentes:
  - **Deteção Passiva:** O Aura deteta que o pedido envolvia JSON e faz `JSON.parse()` à resposta. Se falhar, o pedido ganha uma *badge* vermelha nos *Network Logs* com a mensagem de erro exata (ex: falta de chaveta), explicando imediatamente o porquê do IDE falhar.
  - **Visualizador de JSON Enriquecido:** Para suportar a validação, os componentes visuais do proxy que exibem os JSONs devem ser atualizados para suportar sublinhados vermelhos ou realces indicando a linha/coluna exata onde a sintaxe quebrou.
  - [ ] **3.** **Auto-Healing (Futuro):** O Aura interceta o JSON inválido, injeta uma nova instrução para o Llama em pano de fundo ("Corrije o teu JSON: erro X") e, quando estiver correto, reencaminha de forma transparente para o IDE.
- [ ] **4.** **Análise Lógica do Prompt:** Em vez de mostrar o prompt como um bloco gigante de texto cru, o Aura podia tentar fazer "parsing" inteligente, separando visualmente o System Prompt, o Contexto (ficheiros que o IDE enviou) e a User Instruction. Isto ajudaria muito a ler prompts gigantes.

## ⚡ 2. Performance e Análise de Tokens

## 🎭 3. Mocking e Manipulação (Testes ao Agente)
- [ ] **5.** **Manipulação e Injeção de Contexto (Transformadores de Prompt):** Capacidade de o proxy interceptar e alterar automaticamente o conteúdo dos pedidos antes de chegarem ao Llama. Isto inclui:
  - [ ] **6.** **Injeção de Prefixos/Sufixos:** Adicionar regras fixas ao *System Prompt* (ex: "responde sempre em Português" ou adicionar diretivas de formatação) de forma transparente para o IDE.
  - [ ] **7.** **Otimização Extrema de Contexto e Impacto no KV Cache:**
    - **Atenção (KV Cache):** Qualquer alteração retroativa ao histórico de mensagens pelo Proxy irá quebrar o "prefix matching" dos LLMs locais (como Llama.cpp). Se o Proxy modificar o token #1000 de um histórico de 10.000 tokens, o servidor descartará os 9.000 tokens seguintes da KV Cache e terá de os reprocessar, aumentando drasticamente o TTFT (*Time To First Token*). Estas otimizações são um balanço entre poupar VRAM/Contexto total *vs.* perder a velocidade da cache.
    - **Poda de Chamadas de Tools (Regra do "Latest File State"):** Criar um plugin que detete quando o IDE lê o mesmo ficheiro várias vezes ao longo de diferentes turnos no histórico. Apagar os outputs de leitura mais antigos, mantendo apenas a leitura mais recente na janela de contexto.
      - *Prós:* Reduz drasticamente o consumo total de contexto (VRAM).
      - *Contras (KV Cache):* Ao remover mensagens do passado, todo o contexto a partir desse ponto sofre um "shift", invalidando a cache.
      - *Contras (Comportamental):* **Perda de Capacidade de Reversão!** Se o agente fizer uma edição que introduza um erro, muitas vezes tenta corrigir o erro olhando para o histórico para ver "como estava antes". Se o proxy apagou as leituras antigas, o LLM perde a "memória" do estado funcional anterior do ficheiro, ficando incapacitado de reverter os seus próprios erros.
    - **Minificação de JSON e XML nas Respostas de Tools:** O LLM não precisa de indentação no contexto. Reaproveitar o `FormatFixerPlugin` para detetar estruturadas baseadas em tags/chaves (JSON e XML) e minificá-las, poupando 10% a 20% dos tokens nestes payloads. *(Nota: O YAML é estruturado por espaços, logo não pode ser minificado desta forma).* Para evitar que o LLM (Agente) tente auto-corrigir o que julga ser "falha na formatação", deve injetar-se apenas uma micro-tag `[Minified]` antes do bloco minificado (evitando frases de aviso longas).
      - *Prós:* Se aplicado logo na interceção inicial (antes de entrar no KV Cache), acelera a inferência e não polui o histórico. A tag `[Minified]` resolve a alucinação do modelo consumindo apenas ~3 tokens.
      - *Contras (KV Cache):* Não há desvantagens se minificarmos apenas as respostas *novas*. Aplicar minificação a respostas antigas retroativamente é que destruiria o cache.
    - ~~**Deduplicação "Fuzzy" (Ideia Descartada):**~~ Expandir o deduplicador para tolerar a injeção de pequenas variáveis (como timestamps) no meio do *boilerplate* através de *Sliding Window*.
      - *O Problema (O Risco do Ponto e Vírgula):* Como perfeitamente identificado, tolerar *mismatches* em código é **extremamente perigoso**. Se o agente corrigir um bug adicionando apenas um `;` ou alterando um `==` para `!=` num ficheiro de 2000 caracteres, a diferença é de 0.05%. Um algoritmo "Fuzzy" iria classificar o novo ficheiro como um "duplicado" do histórico antigo com variáveis dinâmicas ignoráveis, e substituiria o ficheiro corrigido pela tag `[Duplicated context omitted]`. O LLM nunca veria a correção! Por este motivo imperativo, a deduplicação de código tem de continuar a ser estritamente *Exact Match* (100% de precisão).
    - **Tokenização do Boilerplate de Sistema:** Muitos IDEs injetam a informação do workspace no início de cada pedido. Criar um plugin que efetue cache destes blocos e os substitua no payload por uma tag de resumo (ex: `[Workspace Context Omitido]`).
      - *Prós:* Impede a saturação da janela de contexto.
      - *Contras (KV Cache):* Se o Boilerplate for colocado no *início* do prompt (como é habitual nos system prompts) e sofrer mínimas alterações a cada pedido pelo IDE, a otimização desse bloco destrói 100% do cache prefix-matching do Llama.cpp.

## 🏗️ 4. Arquitetura e Escalabilidade
- [ ] **8.** **Processamento Integral vs. Streams:** A atual interceção e processamento no `RequestContext` converte pacotes massivos (megabytes de contexto/ficheiros injetados) numa única `String` na heap. Para resolver este estrangulamento de RAM, a arquitetura deve ser bifurcada:
  - **Buffering Plugins:** Precisam de ler a `String` total para memória (ex: `ManualEditorPlugin`, que precisa de apresentar tudo no ecrã para o utilizador editar, ou formatação de JSON que re-estrutura o *payload* inteiro).
  - **Streaming Plugins:** Processam o payload linha-a-linha ou *chunk-a-chunk* encadeando *InputStreams* e *OutputStreams* (ex: `FormatFixerPlugin` usando Expressões Regulares simples ou find & replace leve). Têm impacto zero na memória.
  - **Async Plugins:** Correm numa fila de Virtual Threads isolada. Recebem todo o tipo de pacotes mas o seu output é descartado. Usados para *Read-Only* sem impacto na latência (ex: Live Chat, Database Logs).
  - **Passo 1 (Concluído):** Adição das interfaces base `AsyncPlugin`, `BufferingPlugin` e `StreamingPlugin`, e a refatorização do Live Chat e Network Logs.
  - **Próximos Passos:** 
    - Modificar o `RequestContext` para expor o `InputStream` para os plugins que sejam streaming puros.
    - Atualizar a interface do Frontend para exibir as *badges* ⚡ (Streaming), 🔄 (Async) e ⚠️ (Buffering) - *Concluído!*
    - Converter o `FormatFixerPlugin` para Streaming puro, deixando o `ContextDeduplicatorPlugin` (sliding window complexa) e o `ManualEditorPlugin` como Buffering.

## ✨ 5. UX/UI & Quality of Life Improvements
- [ ] **9.** **Intelligent Auto-Scroll in Live Chat**: The live chat should stop auto-scrolling if the user scrolls up to read past messages, and provide a "⬇️ Scroll to Bottom" button to resume following the live stream.
- [ ] **10.** **Monaco Editor IntelliSense (JSON Schema)**: Inject the official OpenAI Chat Completion JSON schema into the Manual Editor. This will provide autocompletion (Ctrl+Space), real-time validation, and hover tooltips for all properties (e.g., `temperature`, `max_tokens`, `messages`).
- [ ] **11.** **Global Search Palette (Cmd/Ctrl + K)**: A global search overlay modal that taps into the FTS5 SQLite database, allowing the user to search the entire chat history instantly from anywhere in the app and jump straight to the relevant Archive session.
- [ ] **12.** **Modern Toast Notifications**: Replace intrusive SSE alerts for minor system events (like "Settings Saved") with a modern, stackable toast notification library (e.g., Sonner).
- [ ] **13.** **Network Traffic Indicator**: Add a subtle pulsing green dot or mini-graph in the bottom Status Bar that flashes whenever the proxy is actively forwarding packets or streaming chunks, giving an immediate tactical feel that the system is "thinking".
