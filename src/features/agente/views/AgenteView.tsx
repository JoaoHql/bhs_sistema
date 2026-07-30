import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import type { WorkspaceSource, ChartConfig, AppModule } from '../../../types';
import { DynamicChart } from '../../../components/shared/DynamicChart';
import { 
  Send, 
  Sparkles, 
  Plus, 
  Trash2, 
  MessageCircle, 
  Paperclip, 
  Brain,
  HelpCircle,
  Clock,
  Monitor,
  Mic,
  RotateCcw,
  Folder
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  textHistory?: string[]; // Histórico para o botão Desfazer (Undo)
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

interface ParsedContent {
  type: 'text' | 'chart' | 'module';
  content: string;
  chartConfig?: ChartConfig;
  moduleConfig?: AppModule;
}

const parseMessageContent = (text: string, isStreaming?: boolean): ParsedContent[] => {
  const parts: ParsedContent[] = [];
  const regex = /```(json_chart|json_module)\s*([\s\S]*?)\s*```/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push({ type: 'text', content: textBefore });
    }
    
    const blockType = match[1];
    const jsonStr = match[2];
    
    if (!isStreaming) {
      try {
        if (blockType === 'json_chart') {
          const chartConfig: ChartConfig = JSON.parse(jsonStr);
          parts.push({
            type: 'chart',
            content: jsonStr,
            chartConfig
          });
        } else if (blockType === 'json_module') {
          const moduleConfig: AppModule = JSON.parse(jsonStr);
          parts.push({
            type: 'module',
            content: jsonStr,
            moduleConfig
          });
        }
      } catch (err) {
        console.error(`Erro ao fazer parse do ${blockType}:`, err);
        parts.push({ type: 'text', content: match[0] });
      }
    } else {
      parts.push({
        type: 'text',
        content: blockType === 'json_chart'
          ? '\n*(🤖 Preparando visualização de dados...)*\n'
          : '\n*(⚙️ Configurando novo módulo na barra lateral...)*\n'
      });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  const textAfter = text.substring(lastIndex);
  if (textAfter.trim() || parts.length === 0) {
    parts.push({ type: 'text', content: textAfter });
  }
  
  return parts;
};

// Response mapping based on actual dashboard data and active workspaces
const getAgentResponse = (userText: string, activeWorkspaces: WorkspaceSource[]): string => {
  const text = userText.toLowerCase();
  
  const activeBases = activeWorkspaces.filter(w => w.isActiveForAgent);
  if (activeBases.length === 0) {
    return `⚠️ **Nenhuma base de dados ativa no momento!**

Para que eu possa responder perguntas ou criar visualizações de dados, você precisa ir ao menu **Workspace de Dados** ou usar o seletor no topo da tela do chat para ativar pelo menos uma fonte de dados de simulação.`;
  }

  const baseNames = activeBases.map(b => `\`${b.fileNameOrConn}\``).join(', ');

  // Dynamic Module Creator Triggers - Redirect to Ask AI
  if (text.includes('crie um módulo') || text.includes('criar módulo') || text.includes('cria um modulo') || text.includes('novo módulo') || text.includes('crie uma aba') || text.includes('cria o modulo') || text.includes('crie a aba') || text.includes('cria uma tela') || text.includes('criar tela') || text.includes('crie a tela') || text.includes('remover tela') || text.includes('deletar tela') || text.includes('excluir tela')) {
    return `⚙️ **Painel de Configuração de Layouts & Telas (Ask AI)**

Para criar, modificar ou desfazer telas e módulos no menu, por favor utilize o painel exclusivo **Ask AI** clicando no botão **Sparkles Ask AI** localizado no canto superior direito da tela (ao lado do botão de Suporte). 

Ele foi desenhado especificamente para gerenciar a infraestrutura visual do seu painel de BI de forma consistente e padronizada.`;
  }

  // CASE 1: Only SQLite base is active (vendas_shopee_2026.db)
  const isOnlyShopee = activeBases.length === 1 && activeBases[0].type === 'sqlite';
  if (isOnlyShopee) {
    if (text.includes('filial') || text.includes('filiais') || text.includes('sudeste') || text.includes('nordeste') || text.includes('vendeu')) {
      return `Consultando exclusivamente a base SQLite da **Shopee** (${baseNames}):

A **Filial Sudeste** despachou a maior fatia de pedidos integrados do marketplace:
* **Filial Sudeste**: R$ 1.246.720 (45.0% de participação)
* **Filial Sul**: R$ 885.440 (32.0% de participação)
* **Filial Nordeste**: R$ 638.840 (23.0% de participação)

\`\`\`json_chart
{
  "id": "chart-sales-filial-shopee",
  "workspaceId": "ws-2",
  "type": "bar",
  "title": "Pedidos Shopee por Filial",
  "description": "Faturamento agregado por filial na plataforma Shopee (SQLite).",
  "dimensions": [{"field": "filial", "label": "Filial"}],
  "metrics": [{"field": "valor_pago", "label": "Faturamento", "aggregation": "sum", "format": "currency"}],
  "options": {"color": "#ea580c"}
}
\`\`\`

*Nota: Estes valores refletem apenas transações cujo canal registrado na base de dados é a Shopee.*`;
    }
    if (text.includes('pedido') || text.includes('frete') || text.includes('taxa') || text.includes('shopee') || text.includes('status')) {
      return `Acessando o dicionário e dados da base **Shopee** (${baseNames}):

O **valor de frete acumulado** somou **R$ 214.104**, com um ticket de frete médio de **R$ 12,00** por envio. 
Status de pedidos mapeados:
* **Enviados**: 78%
* **Entregues**: 18%
* **Cancelados**: 4%`;
    }
  }

  // CASE 2: Only Excel base is active (clientes_rfv_crm.xlsx)
  const isOnlyCRM = activeBases.length === 1 && activeBases[0].type === 'excel';
  if (isOnlyCRM) {
    if (text.includes('rfv') || text.includes('clientes') || text.includes('at risk') || text.includes('risco') || text.includes('segmentos')) {
      return `Acessando os registros da planilha de CRM **Excel** (${baseNames}):

Mapeei a segmentação RFV (Recência, Frequência e Valor) dos clientes ativos:
* **Champions**: Clientes recorrentes de alto valor.
* **Loyal**: Clientes frequentes de ticket médio.
* **At Risk**: Clientes sem transações nos últimos 90 dias.

\`\`\`json_chart
{
  "id": "chart-rfv-segments-crm",
  "workspaceId": "ws-3",
  "type": "pie",
  "title": "Distribuição de Clientes por Cluster RFV",
  "description": "Participação no volume total gasto por segmento (Excel).",
  "dimensions": [{"field": "cluster_segmento", "label": "Cluster"}],
  "metrics": [{"field": "total_gasto", "label": "Total Gasto", "aggregation": "sum", "format": "currency"}],
  "options": {"colors": ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]}
}
\`\`\`

*Ação recomendada para 'At Risk': Disparar uma campanha de e-mail marketing oferecendo cupom de desconto em serviços de licença.*`;
    }
  }

  // CASE 3: Only API base is active (dre_consolidado_api)
  const isOnlyDRE = activeBases.length === 1 && activeBases[0].type === 'api';
  if (isOnlyDRE) {
    if (text.includes('dre') || text.includes('lucro') || text.includes('líquido') || text.includes('ebitda') || text.includes('caixa')) {
      return `Consumindo os demonstrativos contábeis via **API REST** (${baseNames}):

Dados gerados via API consolidada:
* **Receita Bruta**: R$ 2.450.000,00
* **Deduções e Devoluções**: R$ 380.000,00
* **Custos Operacionais**: R$ 1.890.000,00
* **EBITDA**: R$ 438.450,00 (Margem de 17.8%)
* **Lucro Líquido**: R$ 310.000,00

\`\`\`json_chart
{
  "id": "chart-dre-api-evolution",
  "workspaceId": "ws-4",
  "type": "line",
  "title": "Evolução do Lucro Líquido (API)",
  "description": "Resultado financeiro líquido por mês de referência da DRE.",
  "dimensions": [{"field": "mes_ano", "label": "Mês/Ano"}],
  "metrics": [{"field": "lucro_liquido", "label": "Lucro Líquido", "aggregation": "sum", "format": "currency"}],
  "options": {"color": "#0ea5e9"}
}
\`\`\`

*A API está online e respondendo com status 200 (Sucesso).*`;
    }
  }

  // GENERAL/CONSOLIDATED CASE (Multiple bases active)
  if (text.includes('filial') || text.includes('filiais') || text.includes('sudeste') || text.includes('nordeste') || text.includes('vendeu')) {
    return `Analisando os dados consolidados das filiais, baseando-me nas fontes ativas (${baseNames}):

A **Filial Sudeste** é a líder absoluta de faturamento no período, acumulando **R$ 9.246.720** anualizados. Isso representa **42% da receita total** da empresa.

Distribuição de faturamento consolidada:
* **Filial Sudeste**: R$ 9.246.720 (42.0% de participação)
* **Filial Sul**: R$ 7.485.440 (34.0% de participação)
* **Filial Nordeste**: R$ 5.283.840 (24.0% de participação)

\`\`\`json_chart
{
  "id": "chart-sales-filial-consolidated",
  "workspaceId": "ws-1",
  "type": "bar",
  "title": "Faturamento Consolidado por Filial",
  "description": "Faturamento total agrupado por filial geográfica (CSV).",
  "dimensions": [{"field": "filial", "label": "Filial"}],
  "metrics": [{"field": "valor_liquido", "label": "Faturamento", "aggregation": "sum", "format": "currency"}],
  "options": {"color": "#3b82f6"}
}
\`\`\`

*Informação consolidada cruzando dados contidos nas bases: ${baseNames}.*`;
  }
  
  if (text.includes('dre') || text.includes('lucro') || text.includes('líquido') || text.includes('liquido') || text.includes('consolidado') || text.includes('margem liquida') || text.includes('margem líquida')) {
    return `De acordo com o demonstrativo da **DRE Gerencial** extraído das fontes (${baseNames}), o **Lucro Líquido consolidado do ano** fechou em **R$ 3.058.460**, resultando em uma **margem líquida média de 13.9%** sobre a Receita Líquida total.

Destaques da DRE consolidada:
* **Receita Líquida**: R$ 22.016.000 (100.0%)
* **Lucro Bruto**: R$ 12.373.000 (56.2% de margem)
* **EBITDA**: R$ 4.028.928 (18.3% de margem)
* **Lucro Líquido**: R$ 3.058.460 (13.9% de margem)

\`\`\`json_chart
{
  "id": "chart-dre-evolution-consolidated",
  "workspaceId": "ws-4",
  "type": "line",
  "title": "Evolução do Lucro Líquido Consolidado",
  "description": "Demonstração de lucros líquidos agregados do DRE (API).",
  "dimensions": [{"field": "mes_ano", "label": "Mês/Ano"}],
  "metrics": [{"field": "lucro_liquido", "label": "Lucro Líquido", "aggregation": "sum", "format": "currency"}],
  "options": {"color": "#10b981"}
}
\`\`\`

*Essa análise cruza registros contábeis consolidados a partir de: ${baseNames}.*`;
  }
  
  if (text.includes('rfv') || text.includes('clientes') || text.includes('at risk') || text.includes('risco') || text.includes('segmentação') || text.includes('segmentos')) {
    return `A segmentação de clientes **RFV** processada a partir das fontes selecionadas (${baseNames}) dividiu nossa carteira de faturamento nos seguintes grupos:

* **Champions** (35% do faturamento): Clientes de alta recência e alta frequência.
* **Loyal** (40% do faturamento): Clientes frequentes de ticket médio.
* **At Risk** (25% do faturamento): Clientes inativos nos últimos 90 dias.

\`\`\`json_chart
{
  "id": "chart-rfv-segments-consolidated",
  "workspaceId": "ws-3",
  "type": "pie",
  "title": "Distribuição de Clientes por Cluster RFV",
  "description": "Participação no volume total gasto por segmento (Planilha Excel).",
  "dimensions": [{"field": "cluster_segmento", "label": "Cluster"}],
  "metrics": [{"field": "total_gasto", "label": "Total Gasto", "aggregation": "sum", "format": "currency"}],
  "options": {"colors": ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]}
}
\`\`\`

*Ação para 'At Risk': Disparar e-mail marketing oferecendo cupom de desconto em renovações de licenças.*`;
  }
  
  if (text.includes('ebitda') || text.includes('margem ebitda') || text.includes('caixa')) {
    return `O **EBITDA consolidado** calculado a partir das bases (${baseNames}) fechou em **R$ 4.028.928**, correspondendo a uma **margem EBITDA consolidada de 18.3%** sobre a Receita Líquida total de R$ 22.016.000.

O EBITDA operacional teve seu melhor desempenho nos meses de:
* **Junho**: R$ 438.450 (18.6% de margem)
* **Dezembro**: R$ 603.900 (19.8% de margem)

\`\`\`json_chart
{
  "id": "chart-ebitda-evolution-consolidated",
  "workspaceId": "ws-4",
  "type": "bar",
  "title": "Evolução do EBITDA Mensal",
  "description": "Evolução do Lucro EBITDA gerencial por mês de referência (API).",
  "dimensions": [{"field": "mes_ano", "label": "Mês/Ano"}],
  "metrics": [{"field": "ebitda", "label": "EBITDA", "aggregation": "sum", "format": "currency"}],
  "options": {"color": "#8b5cf6"}
}
\`\`\`

*Estatísticas calculadas a partir das conexões ativas: ${baseNames}.*`;
  }
  
  if (text.includes('oi') || text.includes('olá') || text.includes('ola') || text.includes('bom dia') || text.includes('boa tarde') || text.includes('ajuda') || text.includes('quem é você')) {
    return `Olá! Eu sou o **Agente de Decisão BHS**, integrado ao seu painel de BI.

No momento, estou direcionado e respondendo com base nas **fontes de dados ativas**: ${baseNames}.

Posso responder perguntas sobre desempenho de filiais, DRE ou margem EBITDA. O que deseja consultar?`;
  }

  return `Entendi sua dúvida. No modo de homologação com as bases de dados selecionadas (${baseNames}), posso responder perguntas como:
* *"Qual filial vendeu mais?"*
* *"Como ficou o Lucro Líquido consolidado na DRE?"*
* *"Qual a margem EBITDA média?"*
* *"Como tratar clientes At Risk?"*`;
};

const StreamText: React.FC<{ text: string; onComplete: () => void }> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    // Strip both json_chart and json_module blocks for typing animation, replacing them with custom indicators
    const cleanText = text
      .replace(/```json_chart\s*([\s\S]*?)\s*```/g, '\n*(🤖 Preparando visualização de dados...)*\n')
      .replace(/```json_module\s*([\s\S]*?)\s*```/g, '\n*(⚙️ Configurando novo módulo na barra lateral...)*\n');
    const words = cleanText.split(' ');
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedText(prev => prev + (prev ? ' ' : '') + words[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
        onComplete();
      }
    }, 15);
    
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return <>{renderMessageText(displayedText)}</>;
};

// Bold and list parser helper
const renderMessageText = (text: string) => {
  return text.split('\n').map((line, lineIndex) => {
    if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
      const content = line.trim().substring(1).trim();
      return (
        <div key={lineIndex} className="ml-4 flex items-start gap-2 mb-1.5 text-slate-700 text-xs sm:text-sm">
          <span className="text-blue-600 font-bold shrink-0">•</span>
          <span>{renderBoldText(content)}</span>
        </div>
      );
    }
    const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const content = numberedMatch[2];
      return (
        <div key={lineIndex} className="ml-4 mb-1.5 text-slate-700 text-xs sm:text-sm flex gap-1.5">
          <span className="font-bold text-blue-600">{num}.</span>
          <span>{renderBoldText(content)}</span>
        </div>
      );
    }
    return (
      <p key={lineIndex} className="mb-2 text-slate-700 text-xs sm:text-sm leading-relaxed last:mb-0">
        {renderBoldText(line)}
      </p>
    );
  });
};

const renderBoldText = (text: string) => {
  if (text.startsWith('*') && text.endsWith('*')) {
    return <span className="italic text-slate-500 font-medium">{text.slice(1, -1)}</span>;
  }
  
  const parts = text.split(/(\*\*.*?\*\*)/);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

export const AgenteView: React.FC = () => {
  const { workspaces, toggleWorkspaceActive, addUserModule, setCurrentTab } = useDashboard();

  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: 'session-2',
      title: 'Análise de Desempenho Regional',
      date: 'Hoje',
      messages: [
        { id: '1a', sender: 'agent', text: 'Olá! Carreguei o faturamento das filiais para a nossa homologação. Como posso ajudar?', timestamp: '11:42' }
      ]
    },
    {
      id: 'session-1',
      title: 'Auditoria de DRE e Margens',
      date: 'Ontem',
      messages: [
        { id: '2a', sender: 'user', text: 'Qual a margem EBITDA média?', timestamp: '15:20' },
        { id: '2b', sender: 'agent', text: 'O EBITDA consolidado foi de R$ 4.028.928, resultando em uma margem EBITDA de 18.3%.', timestamp: '15:20' }
      ]
    },
    {
      id: 'session-3',
      title: 'Segmentação RFV - At Risk',
      date: '18 de Junho',
      messages: [
        { id: '3a', sender: 'user', text: 'Como reativar os clientes At Risk?', timestamp: '11:05' },
        { id: '3b', sender: 'agent', text: 'A análise RFV dividiu nossa carteira de clientes, indicando 25% no grupo At Risk. Recomendo campanhas personalizadas de cupons de reativação.', timestamp: '11:05' }
      ]
    }
  ]);
  
  const [activeSessionId, setActiveSessionId] = useState<string>('session-2');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync active messages when session changes
  useEffect(() => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (activeSession) {
      setMessages(activeSession.messages);
    }
  }, [sessions, activeSessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Effect to scan messages for dynamic modules generated by IA and register them in the store
  useEffect(() => {
    sessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.sender === 'agent' && !msg.isStreaming) {
          const regex = /```json_module\s*([\s\S]*?)\s*```/g;
          let match;
          while ((match = regex.exec(msg.text)) !== null) {
            try {
              const mod: AppModule = JSON.parse(match[1]);
              addUserModule(mod);
            } catch (err) {
              console.error('Erro ao ler modulo dinamico do chat:', err);
            }
          }
        }
      });
    });
  }, [sessions, addUserModule]);

  // handle undo configuration from message history
  const handleUndoMessage = (msgId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: s.messages.map(m => {
            if (m.id === msgId && m.textHistory && m.textHistory.length > 0) {
              const history = [...m.textHistory];
              const previousText = history.pop()!;
              return {
                ...m,
                text: previousText,
                textHistory: history
              };
            }
            return m;
          })
        };
      }
      return s;
    }));
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;
    
    if (!textToSend) setInputText('');
    
    // Add user message to session
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: formatTime()
    };
    
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, messages: [...s.messages, userMsg] };
      }
      return s;
    }));
    
    setIsTyping(true);
    
    // Simulate Agent Thinking Delay
    setTimeout(() => {
      setIsTyping(false);
      
      const activeSession = sessions.find(s => s.id === activeSessionId);
      const previousMessages = activeSession ? activeSession.messages : [];
      
      let fullResponseText = '';
      let originalText: string | undefined;
      
      const cleanInput = text.toLowerCase().trim();
      const isUndoText = cleanInput === 'desfazer' || cleanInput === 'voltar';
      
      if (isUndoText) {
        // Find latest agent message that has history
        const lastWithHistory = [...previousMessages].reverse().find(m => m.sender === 'agent' && m.textHistory && m.textHistory.length > 0);
        if (lastWithHistory) {
          handleUndoMessage(lastWithHistory.id);
          fullResponseText = 'Sem problemas! Desfiz a última alteração do gráfico.';
        } else {
          fullResponseText = 'Não encontrei nenhuma alteração de gráfico recente para desfazer nesta conversa.';
        }
      } else if (
        cleanInput.includes('linha') || cleanInput.includes('line') || 
        cleanInput.includes('pizza') || cleanInput.includes('pie') || 
        cleanInput.includes('barra') || cleanInput.includes('bar') || 
        cleanInput.includes('cor') || cleanInput.includes('color') || 
        cleanInput.includes('vermelho') || cleanInput.includes('azul') || 
        cleanInput.includes('verde') || cleanInput.includes('roxo') || 
        cleanInput.includes('laranja')
      ) {
        // Find latest agent message containing a chart config
        const lastChartMsg = [...previousMessages].reverse().find(m => m.sender === 'agent' && m.text.includes('```json_chart'));
        if (lastChartMsg) {
          const match = /```json_chart\s*([\s\S]*?)\s*```/.exec(lastChartMsg.text);
          if (match) {
            try {
              const chartConfig: ChartConfig = JSON.parse(match[1]);
              let changed = false;
              let changeDesc = '';
              
              if (cleanInput.includes('linha') || cleanInput.includes('line')) {
                chartConfig.type = 'line';
                changed = true;
                changeDesc = 'tipo de gráfico para **Linha**';
              } else if (cleanInput.includes('pizza') || cleanInput.includes('pie')) {
                chartConfig.type = 'pie';
                changed = true;
                changeDesc = 'tipo de gráfico para **Pizza**';
              } else if (cleanInput.includes('barra') || cleanInput.includes('bar')) {
                chartConfig.type = 'bar';
                changed = true;
                changeDesc = 'tipo de gráfico para **Barras**';
              }
              
              if (cleanInput.includes('vermelho')) {
                chartConfig.options = { ...chartConfig.options, color: '#ef4444' };
                changed = true;
                changeDesc += (changeDesc ? ' e a ' : '') + 'cor para **Vermelho**';
              } else if (cleanInput.includes('azul')) {
                chartConfig.options = { ...chartConfig.options, color: '#3b82f6' };
                changed = true;
                changeDesc += (changeDesc ? ' e a ' : '') + 'cor para **Azul**';
              } else if (cleanInput.includes('verde')) {
                chartConfig.options = { ...chartConfig.options, color: '#10b981' };
                changed = true;
                changeDesc += (changeDesc ? ' e a ' : '') + 'cor para **Verde**';
              } else if (cleanInput.includes('roxo')) {
                chartConfig.options = { ...chartConfig.options, color: '#8b5cf6' };
                changed = true;
                changeDesc += (changeDesc ? ' e a ' : '') + 'cor para **Roxo**';
              } else if (cleanInput.includes('laranja')) {
                chartConfig.options = { ...chartConfig.options, color: '#f97316' };
                changed = true;
                changeDesc += (changeDesc ? ' e a ' : '') + 'cor para **Laranja**';
              }
              
              if (changed) {
                originalText = lastChartMsg.text;
                
                const updatedJsonStr = JSON.stringify(chartConfig, null, 2);
                const newText = lastChartMsg.text.replace(/```json_chart[\s\S]*?```/, `\`\`\`json_chart\n${updatedJsonStr}\n\`\`\``);
                
                // Update the original message directly with history
                setSessions(prev => prev.map(s => {
                  if (s.id === activeSessionId) {
                    return {
                      ...s,
                      messages: s.messages.map(m => m.id === lastChartMsg.id ? {
                        ...m,
                        text: newText,
                        textHistory: [...(m.textHistory || []), originalText!]
                      } : m)
                    };
                  }
                  return s;
                }));
                
                fullResponseText = `Certamente! Alterei o ${changeDesc} do gráfico anterior conforme solicitado. Você pode desfazer a alteração a qualquer momento usando o botão **Desfazer** no topo do gráfico.`;
              }
            } catch (err) {
              console.error('Erro ao modificar o gráfico:', err);
            }
          }
        }
      }
      
      // If we didn't update an existing message, trigger standard response
      if (!fullResponseText) {
        fullResponseText = getAgentResponse(text, workspaces);
      }
      
      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: fullResponseText,
        timestamp: formatTime(),
        isStreaming: true
      };
      
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...s.messages, agentMsg] };
        }
        return s;
      }));
    }, 1000);
  };

  const handleQuickPrompt = (promptText: string) => {
    handleSendMessage(promptText);
  };

  const createNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'Nova Conversa',
      date: 'Hoje',
      messages: [
        {
          id: `welcome-${Date.now()}`,
          sender: 'agent',
          text: 'Olá! Sou o **Agente de Decisão BHS**. Pergunte sobre filiais, DRE ou EBITDA.',
          timestamp: formatTime()
        }
      ]
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      if (sessionId === activeSessionId) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
        } else {
          const defId = 'session-default';
          return [{
            id: defId,
            title: 'Nova Conversa',
            date: 'Hoje',
            messages: [{ id: 'init', sender: 'agent', text: 'Pergunte sobre filiais, DRE ou EBITDA.', timestamp: formatTime() }]
          }];
        }
      }
      return filtered;
    });
  };

  const handleStreamingComplete = (msgId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: s.messages.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)
        };
      }
      return s;
    }));
  };

  const quickPrompts = [
    {
      title: 'Vendas por Filial',
      prompt: 'Qual filial vendeu mais?',
      desc: 'Mostra o faturamento e participação percentual por região.',
      icon: Brain
    },
    {
      title: 'Lucro Consolidado',
      prompt: 'Qual foi o Lucro Líquido consolidado na DRE?',
      desc: 'Consulta o resultado acumulado do ano e a margem líquida total.',
      icon: Sparkles
    },
    {
      title: 'Ações para Clientes At Risk',
      prompt: 'Como reativar os clientes At Risk?',
      desc: 'Apresenta recomendações da segmentação RFV para clientes inativos.',
      icon: HelpCircle
    },
    {
      title: 'Capacidade de Caixa',
      prompt: 'Qual a margem EBITDA média?',
      desc: 'Analisa o EBITDA consolidado e os melhores meses operacionais.',
      icon: Clock
    }
  ];

  return (
    <div className="flex flex-1 w-full bg-slate-50 overflow-hidden h-full">
      {/* LEFT COLUMN: Past Chats Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 hidden md:flex h-full font-sans select-none">
        {/* New Chat Button */}
        <div className="p-4 border-b border-slate-100 shrink-0">
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-blue-600 hover:bg-blue-50/40 text-blue-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            Nova Conversa
          </button>
        </div>

        {/* Chats History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Histórico de Análises</p>
          
          {sessions.map(s => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                className={`group/item w-full flex items-center justify-between transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-[#edf2f9] text-slate-900 border-l-4 border-blue-600 rounded-r-lg' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <button
                  onClick={() => setActiveSessionId(s.id)}
                  className="flex-1 text-left p-3 flex items-start gap-2.5 min-w-0 bg-transparent border-none cursor-pointer"
                >
                  <MessageCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight text-slate-800">{s.title}</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">{s.date}</p>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
                  }}
                  className="p-1.5 mr-1.5 rounded hover:bg-slate-200/50 text-slate-400 hover:text-rose-600 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 cursor-pointer shrink-0"
                  title="Excluir conversa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400">
            <MessageCircle className="w-4 h-4 text-slate-400" />
            <span>AMBIENTE CONVERSACIONAL</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Conversational Pane */}
      <div className="flex-1 flex flex-col bg-[#f4f7fa] relative min-w-0 h-full overflow-hidden font-sans select-none">
        {/* Chat Pane Header */}
        <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="h-9 w-9 bg-[#0f172a] rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
              <Monitor className="w-5 h-5 text-slate-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 leading-none">Agente de Decisão BHS</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Assistente IA Online · Homologação
              </p>
            </div>
          </div>
        </div>

        {/* Active Workspaces Selector Panel */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex flex-wrap items-center gap-3 shrink-0 select-none">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Filtro de Contexto (IA):</span>
          <div className="flex flex-wrap gap-2">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => toggleWorkspaceActive(ws.id)}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  ws.isActiveForAgent
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${ws.isActiveForAgent ? 'bg-blue-600' : 'bg-slate-350'}`} />
                <span>{ws.fileNameOrConn}</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-400 ml-auto flex items-center gap-1 font-semibold">
            <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
            <span>Respostas focadas em {workspaces.filter(w => w.isActiveForAgent).length} fonte(s)</span>
          </div>
        </div>

        {/* Messages and Conversation Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map(msg => {
              const isAgent = msg.sender === 'agent';

              return (
                <div key={msg.id} className={`flex items-start gap-4 ${isAgent ? '' : 'flex-row-reverse'} animate-fade-in`}>
                  {/* Avatar */}
                  {isAgent ? (
                    <div className="h-8 w-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Monitor className="w-4.5 h-4.5 text-slate-200" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      U
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div className="flex flex-col max-w-[80%] md:max-w-[75%]">
                    {/* Bubble */}
                    <div className={`p-4 rounded-2xl shadow-xs border ${
                      isAgent 
                        ? 'bg-white border-slate-200/80 rounded-tl-none text-slate-850' 
                        : 'bg-[#0f172a] border-slate-950 text-white rounded-tr-none'
                    }`}>
                      {isAgent ? (
                        msg.isStreaming ? (
                          <StreamText 
                            text={msg.text} 
                            onComplete={() => handleStreamingComplete(msg.id)} 
                          />
                        ) : (
                          <div className="space-y-3">
                            {parseMessageContent(msg.text, false).map((part, partIdx) => {
                              if (part.type === 'chart' && part.chartConfig) {
                                return (
                                  <div key={partIdx} className="relative group">
                                    <DynamicChart config={part.chartConfig} />
                                    {msg.textHistory && msg.textHistory.length > 0 && (
                                      <button
                                        onClick={() => handleUndoMessage(msg.id)}
                                        className="absolute top-2 right-2 inline-flex items-center space-x-1 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-md text-[9px] font-bold text-slate-650 shadow-sm transition-all cursor-pointer z-10"
                                        title="Desfazer última alteração do gráfico"
                                      >
                                        <RotateCcw className="w-3 h-3 text-slate-500" />
                                        <span>Desfazer</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              }
                              
                              if (part.type === 'module' && part.moduleConfig) {
                                return (
                                  <div key={partIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between select-none my-2">
                                    <div className="flex items-center space-x-3 min-w-0">
                                      <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 shrink-0">
                                        <Folder className="w-4.5 h-4.5" />
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-[11px] font-extrabold text-slate-800 leading-tight">Módulo IA Instalado</h4>
                                        <p className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[170px] sm:max-w-[200px]">
                                          O módulo <strong>{part.moduleConfig.label}</strong> foi anexado ao menu.
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setCurrentTab(part.moduleConfig!.screens[0].id)}
                                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                                    >
                                      Acessar
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div key={partIdx}>
                                  {renderMessageText(part.content)}
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-semibold">{msg.text}</p>
                      )}
                    </div>
                    {/* Timestamp */}
                    <span className={`text-[9px] text-slate-400 font-semibold mt-1.5 px-1 ${isAgent ? 'text-left' : 'text-right'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Simulated typing indicator */}
            {isTyping && (
              <div className="flex items-start gap-4 animate-fade-in">
                <div className="h-8 w-8 rounded-full bg-[#0f172a] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Monitor className="w-4.5 h-4.5 text-slate-200" />
                </div>
                <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl rounded-tl-none shadow-xs flex items-center space-x-1.5 h-10">
                  <div className="w-2.5 h-2.5 bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-slate-350 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions panels */}
          {!messages.some(m => m.sender === 'user') && !isTyping && (
            <div className="max-w-3xl mx-auto mt-8 px-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-4">Atalhos rápidos para análise de dados</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-2xl mx-auto">
                {quickPrompts.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(item.prompt)}
                      className="text-left bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md hover:bg-slate-50/50 p-4 rounded-xl transition-all duration-200 cursor-pointer group flex items-start gap-3.5"
                    >
                      <span className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100/60 transition-colors">
                        <Icon className="w-4.5 h-4.5 text-blue-600" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">{item.title}</h4>
                        <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1.5 group-hover:text-slate-500 transition-colors">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar Section */}
        <div className="p-6 border-t border-slate-200 bg-white shrink-0 shadow-sm">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-slate-50 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/5 rounded-2xl p-2 transition-all">
              {/* Paperclip file attach */}
              <button 
                type="button" 
                className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Anexar arquivo de dados"
              >
                <Paperclip className="w-4.5 h-4.5" />
              </button>

              {/* Chat Input Textbox */}
              <textarea
                rows={1}
                placeholder="Pergunte à IA (ex: 'Qual filial vendeu mais?' ou 'Crie um módulo de logística')"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 max-h-32 min-h-[36px] bg-transparent border-none focus:ring-0 text-slate-750 placeholder:text-slate-400 text-xs sm:text-sm px-3 focus:outline-none resize-none align-middle pt-2"
              />

              {/* Action buttons inside bar */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button 
                  type="button" 
                  className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Usar microfone (Voz para texto)"
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>

                <button
                  type="button"
                  disabled={!inputText.trim()}
                  onClick={() => handleSendMessage()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                  title="Enviar mensagem"
                >
                  <Send className="w-4 h-4 fill-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
