// FAVICON
const favicon = document.getElementById('favicon');
    
function checkTheme(e) {
  if (e.matches) {
    favicon.href = '../images/favicon-light.png';
  } else {
    favicon.href = '../images/favicon-blue.png';
  }
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);

// ── PANEL NAV ──────────────────────────────────────────────
const labels = {profile:'Meu Perfil',orders:'Meus Pedidos',wishlist:'Lista de Desejos',coupons:'Meus Cupons',addresses:'Endereços',payments:'Pagamentos',notifications:'Notificações',security:'Segurança',reviews:'Avaliações',settings:'Configurações',logout:'Sair da Conta'};

function showPanel(id, btn){
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  if(panel) panel.classList.add('active');
  if(btn) btn.classList.add('active');
  else { const nb = document.querySelector(`[data-panel="${id}"]`); if(nb) nb.classList.add('active'); }
  document.getElementById('bcSection').textContent = labels[id] || 'Minha Conta';
  window.scrollTo({top:0, behavior:'smooth'});
}

// ── ACTIONS ────────────────────────────────────────────────
function saveProfile(){ toast('Perfil salvo com sucesso! ✓'); }
function changePwd(){
  const card = document.getElementById('pwdChangeCard');
  card.style.display = card.style.display === 'none' ? 'block' : 'none';
  if(card.style.display === 'block') card.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function removeWish(btn, name){
  const card = btn.closest('.wcard');
  card.style.transition = 'all .3s';
  card.style.opacity = '0';
  card.style.transform = 'scale(.9)';
  setTimeout(() => { card.remove(); toast(`${name} removido dos favoritos`); }, 300);
}
function setTheme(btn, theme){ document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('on')); btn.classList.add('on'); toast(`Tema ${theme==='light'?'claro':theme==='dark'?'escuro':'automático'} ativado`); }
function setAllNotifs(){ document.querySelectorAll('.toggle-inp').forEach(t => t.checked = true); toast('Todas as notificações ativadas! 🔔'); }
function filterOrders(btn, filter){ document.querySelectorAll('.btn-xs.blue, .btn-xs.gray').forEach(b => { if(b.closest('.card') && b.closest('.card').querySelector('.btn-xs')){ b.className = 'btn-xs gray'; } }); btn.className = 'btn-xs blue'; toast(`Filtro aplicado: ${btn.textContent}`,'info'); }
function copyCoupon(code){ navigator.clipboard?.writeText(code); toast(`Cupom ${code} copiado! 📋`); }
function doLogout(){ toast('Saindo da conta... 👋','info'); setTimeout(() => window.location.href = '../', 1200); }

// ── MASKS ──────────────────────────────────────────────────
function maskCPF(inp){ let v=inp.value.replace(/\D/g,'').slice(0,11); if(v.length>9) v=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9); else if(v.length>6) v=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6); else if(v.length>3) v=v.slice(0,3)+'.'+v.slice(3); inp.value=v; }
function maskPhone(inp){ let v=inp.value.replace(/\D/g,'').slice(0,11); if(v.length>6) v='('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7); else if(v.length>2) v='('+v.slice(0,2)+') '+v.slice(2); inp.value=v; }

// ── TOAST ──────────────────────────────────────────────────
function toast(msg, type='ok'){
  const t=document.getElementById('t1');
  const ic=document.getElementById('tIco');
  const tx=document.getElementById('tMsg');
  tx.textContent=msg;
  ic.className=`t-ico ${type}`;
  ic.textContent=type==='ok'?'✓':type==='err'?'!':'ℹ';
  t.classList.add('on');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('on'),3000);
}

// ── SUPABASE: INICIALIZAÇÃO REAL ───────────────────────────
const SUPABASE_URL = "https://cedrpcezoaqaeivrfuxn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mgumCH-bhkDOZfzqaMjKzQ_OwPVESs0";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ESCUTADOR INTELIGENTE DE SESSÃO (Evita loops e corrige o bug do token expirado)
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  
  // O evento 'INITIAL_SESSION' garante que o Supabase já terminou de checar e renovar o token antigo
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    
    // Se REALMENTE não houver sessão após a validação completa, expulsa para o login
    if (!session) {
      window.location.href = '../login/index.html';
      return;
    }

    // USUÁRIO LOGADO COM SUCESSO! Agora preenchemos os dados com segurança:
    const user = session.user;
    const meta = user.user_metadata || {};
    
    const email = user.email || "";
    const fullName = meta.full_name || "Cliente";
    const phone = meta.phone || "";

    // Divide o "Nome Completo" em Nome e Sobrenome
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";

    // Injeta os dados na Barra Lateral (Sidebar)
    const sidebarName = document.getElementById('sidebarName');
    const sidebarEmail = document.getElementById('sidebarEmail');
    if (sidebarName) sidebarName.textContent = fullName;
    if (sidebarEmail) sidebarEmail.textContent = email;

    // Injeta os dados no Formulário de Perfil
    const inputFirstName = document.getElementById('profileFirstName');
    const inputLastName = document.getElementById('profileLastName');
    const inputEmail = document.getElementById('profileEmail');
    const inputPhone = document.getElementById('profilePhone');

    if (inputFirstName) inputFirstName.value = firstName;
    if (inputLastName) inputLastName.value = lastName;
    if (inputEmail) inputEmail.value = email;
    if (inputPhone) {
      inputPhone.value = phone;
      maskPhone(inputPhone); // Aplica a máscara visual ao carregar
    }
  }


Conversation with Gemini
Como criar um botão de "Login com Google" a partir do Google OAuth + Supabase? Deixe bem explicado.

Criar um botão de "Login com Google" usando o Supabase é um processo que envolve três etapas principais: configurar o Google Cloud, conectar essas credenciais ao Supabase e, por fim, criar o código no seu front-end.

Abaixo está o passo a passo completo e detalhado.

1. Configurar o Google Cloud Console
Para permitir que os usuários façam login com o Google, você precisa criar um projeto no Google Cloud e gerar as chaves de acesso.

Acesse o Google Cloud Console e crie um novo projeto (ou selecione um existente).

No menu lateral, vá em APIs e Serviços e depois em Tela de permissão OAuth.

Selecione o tipo de usuário como Externo e clique em Criar. Preencha os campos obrigatórios (nome do app, e-mail de suporte e e-mail do desenvolvedor) e salve.

No menu lateral, clique em Credenciais.

Clique no botão + CRIAR CREDENCIAIS no topo da página e selecione ID do cliente OAuth.

Em "Tipo de aplicativo", escolha Aplicativo da Web.

Na seção "Origens JavaScript autorizadas", adicione a URL do seu site (por exemplo, http://localhost:3000 para desenvolvimento local).

Na seção "URIs de redirecionamento autorizados", você precisará colar a URL de callback do seu projeto Supabase. O formato padrão é https://<SEU_ID_DO_PROJETO>.supabase.co/auth/v1/callback.

Clique em Criar.

Uma janela aparecerá com o ID do cliente (Client ID) e a Chave secreta do cliente (Client Secret). Guarde essas duas informações, pois usaremos no próximo passo.

2. Configurar o provedor no Supabase
Agora você precisa dizer ao Supabase para aceitar logins do Google usando as chaves que você acabou de criar.

Acesse o painel do seu projeto no Supabase.

No menu lateral esquerdo, clique em Authentication (ícone de cadeado) e depois na aba Providers.

Encontre a opção Google na lista e clique para expandir.

Ative a chave Enable Google.

Cole o Client ID (ID do cliente) no primeiro campo.

Cole o Client Secret (Chave secreta do cliente) no segundo campo.

Clique no botão Save para confirmar as alterações.

3. Criar o botão no Front-end (Exemplo com React/JavaScript)
Com o back-end configurado, o último passo é criar a interface e a função que dispara o login. O exemplo abaixo utiliza JavaScript/React, mas a lógica se aplica a qualquer framework.

Primeiro, instale a biblioteca do Supabase no seu projeto:

Bash
npm install @supabase/supabase-js
Em seguida, crie o código de inicialização e o botão:

JavaScript
import { createClient } from '@supabase/supabase-js'

// 1. Inicialize o cliente do Supabase
// Substitua pelas chaves reais do seu projeto Supabase (encontradas em Project Settings -> API)
const supabaseUrl = 'https://<SEU_ID_DO_PROJETO>.supabase.co'
const supabaseKey = '<SUA_CHAVE_ANON_PUBLIC>'
const supabase = createClient(supabaseUrl, supabaseKey)

export default function LoginScreen() {
  
  // 2. Crie a função que dispara o fluxo de autenticação
  async function handleGoogleLogin() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Opcional: Redireciona o usuário para esta página após o login concluído
        redirectTo: 'http://localhost:3000/dashboard'
      }
    })

    if (error) {
      console.error('Erro ao fazer login:', error.message)
    }
  }

  // 3. Crie a interface do botão
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
      <button 
        onClick={handleGoogleLogin}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#4285F4',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Entrar com o Google
      </button>
    </div>
  )
}
Quando o usuário clicar no botão, ele será redirecionado para a tela de permissão padrão do Google. Após fazer o login e autorizar o aplicativo, o Google o enviará de volta para o Supabase, que registrará o usuário no seu banco de dados e o redirecionará para a sua aplicação com a sessão ativa.

Utilize esses códigos como base, mas quero agora a adição do supabase no meio do processo de login

Notei que o seu arquivo script.js já possui a inicialização correta do supabaseClient e lida muito bem com o login via E-mail e Senha. Como inteligência artificial, analisei sua estrutura e vi que você estava tentando integrar o Google usando o SDK nativo deles (o Google Identity Services) e o Facebook através de um script injetado manualmente na página.

A boa notícia é que o Supabase facilita imensamente esse processo. Em vez de carregar bibliotecas externas complexas para cada rede social, nós podemos usar a função nativa signInWithOAuth do Supabase. Ela gerencia todo o redirecionamento e captura de tokens automaticamente.

Abaixo, detalho exatamente o que você precisa mudar nos seus arquivos para que o login social seja processado 100% pelo Supabase.

1. Atualizações no index.html
Como não vamos mais usar as bibliotecas nativas do Google e do Facebook, precisamos transformar a área onde ficavam os botões sociais em botões HTML padrão que acionem a nossa nova função.

O que fazer: Substitua a sua div class="social-row" atual (tanto no formulário de Login quanto no de Registro) pelo código abaixo:

HTML
<div class="social-row">
  <button type="button" class="fb-btn-google-style" onclick="socialLogin('google')" style="flex: 1;">
    <span class="fb-icon-wrap" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px;">
      <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
    </span>
    <span class="fb-btn-text">Entrar com Google</span>
  </button>
  
  <button type="button" class="fb-btn-google-style" onclick="socialLogin('facebook')">
    <span class="fb-icon-wrap">
      <img src="../images/facebook_t.png" alt="Facebook" style="width: 30px; height: auto; display: block;"/>
    </span>
    <span class="fb-btn-text">Entrar com Facebook</span>
  </button>
</div>
Além disso, no final do arquivo index.html, você pode apagar a linha do script do Google, pois o Supabase fará esse trabalho:

HTML
<script src="https://accounts.google.com/gsi/client" async defer></script>
2. Atualizações no script.js
No seu código original, havia várias funções soltas para lidar com a injeção do Google (inicializarEConfigurarGoogle, handleCredentialResponse) e do Facebook (fbAsyncInit). Nós vamos limpar tudo isso.

O que fazer: Apague todos os blocos de código referentes à inicialização complexa do Google e do Facebook e substitua pela nossa nova função socialLogin baseada em OAuth do Supabase.

Seu arquivo script.js ficará muito mais limpo nesta área. Você pode substituir desde a declaração de variáveis do Google até a função antiga de socialLogin por este único bloco:

JavaScript
// ── SOCIAL LOGIN (GOOGLE E FACEBOOK VIA SUPABASE) ──────────
async function socialLogin(provider) {
  // Provider deve ser 'google' ou 'facebook'
  toast(`Redirecionando para o ${provider}...`);
  
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: provider,
    options: {
      // O Supabase redirecionará o usuário para a página principal após o login.
      // Ajuste o caminho se necessário (ex: window.location.origin + '/dashboard.html')
      redirectTo: window.location.origin + '/' 
    }
  });

  if (error) {
    console.error(error);
    toast(`Erro ao conectar com ${provider}.`, 'err');
  }
}

// ── VERIFICADOR DE SESSÃO ATIVA ─────────────────────────────
// (Mantenha o seu verificador original, apenas certifique-se de que 
// ele execute quando a página carregar para pegar o usuário retornando do OAuth)
window.addEventListener('load', () => {
  verificarSessao();
});
O que muda na prática com essa alteração?
Quando o usuário clicar em "Entrar com Google", o método signInWithOAuth do Supabase assumirá o controle.

O usuário será redirecionado para a tela oficial de login da plataforma escolhida.

Após aprovar, a plataforma o enviará de volta para o seu site (na URL definida em redirectTo).

Ao carregar a página de volta, a função verificarSessao() do seu código detectará automaticamente que o usuário tem uma sessão ativa no Supabase e fará o redirecionamento correto para a loja (../).

Apareceu no console "script.js:139 Uncaught (in promise) ReferenceError: supabaseClient is not defined

    at verificarSessao (script.js:139:33)

    at script.js:55:3

verificarSessao @ script.js:139

(anonymous) @ script.js:55

load (async)

(anonymous) @ script.js:54"

Esse erro de ReferenceError: supabaseClient is not defined acontece por um motivo bem simples: na hora de limpar o código antigo do Google e do Facebook no seu script.js, a inicialização do cliente do Supabase acabou sendo deletada sem querer ou ficou fora do escopo global.

Como a função verificarSessao roda assim que a página carrega (window.addEventListener('load', ...)), ela tenta usar o supabaseClient e não o encontra.

Para resolver isso, abra o seu arquivo script.js e certifique-se de que a inicialização do Supabase está logo no topo do arquivo (fora de qualquer função).

Deixe o topo do seu script.js exatamente assim:

JavaScript
// ── 1. INICIALIZAR O SUPABASE (DEVE FICAR NO TOPO) ──────────────────
const SUPABASE_URL = "https://putdougjaadksnfyfbgc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UJYrU4E9UtTywzq3ghGLsQ_fRHE9nRR";

// Esta é a linha que o seu código não estava encontrando:
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ── OUTRAS FUNÇÕES AUXILIARES DA SUA LOJA ───────────────────────────
function buttonLink(url) {
  window.location.href = url;
}

// FAVICON
const favicon = document.getElementById('favicon');
function checkTheme(e) {
  if (e.matches) { favicon.href = '../images/favicon-light.png'; } 
  else { favicon.href = '../images/favicon-blue.png'; }
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);


// ── SOCIAL LOGIN (GOOGLE E FACEBOOK VIA SUPABASE) ──────────
async function socialLogin(provider) {
  toast(`Redirecionando para o ${provider}...`);
  
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: window.location.origin + '/' 
    }
  });

  if (error) {
    console.error(error);
    toast(`Erro ao conectar com ${provider}.`, 'err');
  }
}

// O restante do seu código (doLogin, doRegister, verificarSessao) continua igual abaixo...
O que verificar após colar isso:
Certifique-se de que a constante const supabaseClient não está duplicada e nem dentro de nenhuma outra função. Ela precisa ser global para que doLogin(), doRegister() e verificarSessao() consigam acessá-la livremente.

Salve o arquivo e atualize a página limpando o cache do navegador (Ctrl + F5 ou Cmd + Shift + R). O erro sumirá imediatamente.

e onde consegue esse código do supabase (esqueci onde fica)?

Para encontrar as credenciais do seu projeto (o SUPABASE_URL e a SUPABASE_ANON_KEY), você só precisa acessar o painel de controle do Supabase.

Siga este passo a passo rápido:

Acesse o Supabase Dashboard e clique no seu projeto.

No menu lateral esquerdo, navegue até o final e clique no ícone de engrenagem (Project Settings / Configurações do Projeto).

Dentro das configurações, clique na opção API (fica logo abaixo de General).

Nessa tela, você encontrará exatamente o que precisa nas seguintes seções:

Project URL: O link que está no campo URL é o seu SUPABASE_URL.

Project API keys: Procure pela linha que tem a etiqueta anon public. A sequência de texto ao lado dela é a sua SUPABASE_ANON_KEY.

⚠️ Aviso de segurança importante: Nessa mesma tela de API existe uma chave chamada service_role. Nunca coloque a service_role no seu arquivo script.js do front-end, pois ela dá acesso total e irrestrito ao seu banco de dados e qualquer pessoa inspecionando a página poderia vê-la. Use sempre a chave anon (public).

para segurança, tem como criar uma .env para esses códigos do supabase ou não é necessário?

Essa é uma excelente pergunta sobre segurança! A resposta curta é: No front-end (HTML/JS puro), criar um arquivo .env não vai esconder suas chaves de um usuário malicioso, mas o uso dele depende de como você gerencia seu código.

Vamos entender como isso funciona na prática e por que a arquitetura do Supabase lida com isso de forma diferente.

O "Mito" do .env no Front-end
Muitos desenvolvedores acham que colocar as chaves em um arquivo .env as torna invisíveis. No entanto, se o seu código roda inteiramente no navegador do usuário (como o seu script.js atual), o navegador precisa ler essas chaves para fazer as requisições ao Supabase.

Se você usa HTML/JS puro (sem ferramentas de build): O navegador não consegue ler arquivos .env nativamente. Você teria que deixar os valores no código mesmo.

Se você usar ferramentas como Vite, Webpack ou Next.js: Você até pode usar um .env (ex: VITE_SUPABASE_ANON_KEY). Mas na hora que o site é compilado para ir para a internet, a ferramenta injeta o texto real no JavaScript. Qualquer pessoa que abrir o "Inspecionar Elemento" (F12) e olhar a aba Network (Rede) ou Sources conseguirá ver a sua chave.

Então, meu projeto está inseguro? 🔐
Não! E aqui está o segredo do Supabase: a chave SUPABASE_ANON_KEY que você está usando foi feita para ser pública. O próprio nome diz: anon (anônima) e public (pública).

A segurança do Supabase não depende de esconder essa chave, mas sim de uma tecnologia dentro do banco de dados chamada RLS (Row Level Security - Segurança em Nível de Linha).

Como o RLS funciona: Mesmo que um hacker pegue a sua URL e a sua chave pública, se o RLS estiver ativo nas suas tabelas do Supabase, ele não conseguirá ver ou alterar nenhum dado, a menos que ele cumpra as regras que você definiu (por exemplo: "este usuário só pode ler dados se estiver autenticado com o e-mail X").

Quando vale a pena usar .env?
Mesmo não escondendo o código do usuário final, usar um .env é altamente recomendado se você se encaixar em uma destas situações:

Se você for subir seu código no GitHub: Você nunca deve enviar suas chaves para um repositório público. O .env serve para manter as chaves na sua máquina local, e você adiciona o arquivo .env no seu .gitignore para ele não ser enviado à internet.

Organização: Se você mudar de banco de dados (produção vs. homologação), só precisa alterar o arquivo .env, sem mexer no código principal.

Como aplicar no seu projeto atual?
Como seu projeto é HTML/JS puro (sem empacotadores de código como Vite), para usar .env você precisaria configurar um mini-servidor ou começar a usar uma ferramenta de build (como o Vite). Se você deixar as chaves expostas no script.js para um projeto de estudos ou portfólio, está tudo bem, desde que as regras de RLS estejam configuradas no painel do Supabase.

Você pretende subir esse código para um repositório público no GitHub ou por enquanto está rodando apenas localmente na sua máquina?

e como mudar o "Sign in to [code].supabase.co" na janela do Google?

Essa é uma excelente dúvida. Aquela mensagem clássica "Sign in to [seu-id].supabase.co" acontece porque, por padrão, o Google lê o domínio da URL de redirecionamento (Callback URL) que você configurou nas credenciais. Como essa URL aponta para os servidores do Supabase, o Google mostra o domínio deles por segurança.

Para mudar isso e deixar o fluxo com a cara da sua marca, existem duas soluções (uma gratuita e rápida, e outra definitiva).

Solução 1: Configurar a Identidade Visual (Branding) no Google Cloud
(Gratuito e resolve a maior parte do problema)

Em vez de mostrar apenas o link cinza e sem graça da URL, você pode fazer o Google exibir o nome oficial do seu app e o seu logotipo.

Acesse o Google Cloud Console.

Vá no menu lateral em APIs e Serviços > Tela de permissão OAuth (ou Plataforma Google Auth > Branding).

Preencha os campos:

Nome do aplicativo: Coloque exatamente o nome da sua loja/empresa.

Logotipo do aplicativo: Suba uma imagem quadrada da sua logo.

Domínios autorizados: Adicione o domínio final do seu site (ex: seu-ecomme.com.br).

Salve as alterações.

💡 Nota: Se o seu app for público (External), o Google exigirá que você passe por um processo de Verificação de Marca (Brand Verification) para que o logo apareça para todo mundo. Enquanto estiver em ambiente de testes ou sem verificação, ele pode exibir um aviso de "App não verificado", mas o nome já começará a aparecer.

Solução 2: Custom Domain no Supabase (A solução definitiva)
(Geralmente requer um plano pago do Supabase)

Se você quer remover completamente o texto .supabase.co da janela do Google e substituí-lo por algo como Sign in to auth.seu-ecomme.com, você precisa "esconder" a URL do Supabase atrás do seu próprio domínio.

No painel do Supabase, vá em Project Settings > Custom Domains.

Configure um subdomínio próprio para apontar para o seu banco (por exemplo: api.seudominio.com ou auth.seudominio.com).

Siga as instruções do Supabase para adicionar os registros DNS no seu provedor (como Cloudflare, Hostgator, etc.).

Depois de ativo, você precisará voltar no Google Cloud Console e alterar as suas credenciais:

Mude o URI de redirecionamento autorizado de https://xyz.supabase.co/auth/v1/callback para https://auth.seudominio.com/auth/v1/callback.

Fazendo isso, o Google entenderá que o seu próprio site está gerenciando a autenticação, deixando o processo 100% profissional e transparente para o seu cliente.

E por que quando faz o login com o Google volta para a tela inicial do site com um código gigante depois do link?

Esse "código gigante" na barra de endereço é completamente normal e faz parte do funcionamento padrão do protocolo OAuth 2.0 (o sistema que gerencia o login social).

Esse textão (que geralmente começa com ?code=... ou #access_token=...) é o token de autenticação ou o código de troca que o Google gerou para provar ao Supabase que você é realmente você.

O fluxo acontece da seguinte forma:

Você clica em "Logar com Google".

O Google valida sua identidade e redireciona de volta para o seu site, passando esse código na URL como se fosse um "recibo comprovante".

O script do Supabase no seu front-end lê esse código diretamente da URL, valida com os servidores dele, inicia a sessão do usuário e salva os dados no localStorage do navegador.

Como fazer a URL ficar "limpa" de novo?
Embora o Supabase use esse código e depois ele não seja mais necessário, deixar aquele link enorme na tela não fica muito elegante para o usuário.

A boa notícia é que você pode limpar a URL usando a API nativa do próprio navegador (history.replaceState) logo após o Supabase processar o login.

No seu arquivo script.js, dentro da sua função verificarSessao, você pode adicionar uma linha para limpar os parâmetros da URL assim que detectar que o usuário foi conectado com sucesso.

Veja o exemplo de como adaptar a sua função:

JavaScript
async function verificarSessao() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();

  if (session) {
    // 1. Limpa o código gigante da URL sem recarregar a página
    window.history.replaceState({}, document.title, window.location.pathname);

    // 2. Continua com o seu fluxo normal de redirecionamento para a loja
    toast('Sessão ativa! Redirecionando... 🎉');
    setTimeout(() => {
      window.location.href = '../'; 
    }, 1500);
  } else {
    // Se não tiver sessão, apenas mantém o usuário na tela de login
    console.log("Nenhum usuário autenticado.");
  }
}
O que o window.history.replaceState faz?
Ele reescreve a barra de endereço do navegador apagando tudo o que vem depois do domínio principal (removendo os pontos de interrogação, hashes e códigos), mas sem dar F5 na página. O usuário ganha uma interface limpa instantaneamente e o login continua funcionando perfeitamente nos bastidores.

Dê o script.js todo com tudo corrigido, mantendo as outras coisa que antes tinha e que são necessários para o funcionamento

Aqui está o arquivo script.js completo, limpo e corrigido.

Eu removi todas as lógicas antigas de injeção dos SDKs do Google e do Facebook, coloquei a inicialização do Supabase no lugar correto (no topo) e adicionei a função que limpa a URL após o login, mantendo intactas todas as animações, validações, máscaras e sistema de login/cadastro com e-mail e senha.

Você pode copiar o bloco abaixo e substituir todo o conteúdo do seu script.js atual por ele:

JavaScript
// ── 1. INICIALIZAR O SUPABASE (DEVE FICAR NO TOPO) ──────────────────
const SUPABASE_URL = "https://putdougjaadksnfyfbgc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UJYrU4E9UtTywzq3ghGLsQ_fRHE9nRR";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── NAVEGAÇÃO E TEMA ───────────────────────────────────────────────
function buttonLink(url) {
  window.location.href = url;
}

// FAVICON
const favicon = document.getElementById('favicon');
    
function checkTheme(e) {
  if (e.matches) {
    favicon.href = '../images/favicon-light.png';
  } else {
    favicon.href = '../images/favicon-blue.png';
  }
}
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
checkTheme(mqDark);
mqDark.addEventListener('change', checkTheme);


// ── TAB SWITCH ─────────────────────────────────────────────
function showTab(tab){
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('on', isLogin);
  document.getElementById('tabReg').classList.toggle('on', !isLogin);
  document.getElementById('formLogin').classList.toggle('hidden', !isLogin);
  document.getElementById('formReg').classList.toggle('hidden', isLogin);
  if(isLogin) toggleForgot(false);
}

// Monitor de carregamento da página
window.addEventListener('load', () => {
  verificarSessao();
});


// ── SOCIAL LOGIN (GOOGLE E FACEBOOK VIA SUPABASE) ──────────
async function socialLogin(provider) {
  toast(`Redirecionando para o ${provider}...`);
  
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: window.location.origin + '/' 
    }
  });

  if (error) {
    console.error(error);
    toast(`Erro ao conectar com ${provider}.`, 'err');
  }
}


// ── LOGIN COM E-MAIL E SENHA REAL (SUPABASE) ────────────────
async function doLogin(){
  let valid = true;
  const email = document.getElementById('loginEmail');
  const pwd   = document.getElementById('loginPwd');

  if(!validateEmail(email.value.trim())){
    showFieldErr(email,'loginEmailErr'); valid = false;
  }
  if(!pwd.value){
    showFieldErr(pwd,'loginPwdErr'); valid = false;
  }
  if(!valid){ toast('Preencha os campos obrigatórios','err'); return; }

  const btn = document.getElementById('btnLogin');
  btn.classList.add('loading');

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email.value.trim(),
    password: pwd.value,
  });

  btn.classList.remove('loading');

  if (error) {
    toast('E-mail ou senha incorretos.', 'err');
  } else {
    toast('Login realizado com sucesso! 🎉');
    setTimeout(() => window.location.href = '../', 1200);
  }
}


// ── CADASTRO COM E-MAIL E SENHA REAL (SUPABASE) ─────────────
async function doRegister(){
  let valid = true;
  const name  = document.getElementById('regName');
  const email = document.getElementById('regEmail');
  const phone = document.getElementById('regPhone');
  const pwd   = document.getElementById('regPwd');
  
  const termsAge = document.getElementById('acceptAge');
  const termsDoc = document.getElementById('acceptTerms');

  if(!name.value.trim()){ showFieldErr(name,'regNameErr'); valid = false; }
  if(!validateEmail(email.value.trim())){ showFieldErr(email,'regEmailErr'); valid = false; }
  
  const phoneValue = phone.value.replace(/\D/g, '');
  if(phoneValue.length < 11){ showFieldErr(phone, 'regPhoneErr'); valid = false; }
  if(pwd.value.length < 8){ showFieldErr(pwd,'regPwdErr'); valid = false; }
  
  if(termsAge && !termsAge.checked){ toast('Precisa de ter 18 anos ou mais','err'); return; }
  if(termsDoc && !termsDoc.checked){ toast('Aceite os termos para continuar','err'); return; }
  
  if(!valid) return;

  const btn = document.getElementById('btnReg');
  btn.classList.add('loading');

  const { data, error } = await supabaseClient.auth.signUp({
    email: email.value.trim(),
    password: pwd.value,
    options: {
      data: {
        full_name: name.value.trim(),
        phone: phoneValue
      }
    }
  });

  btn.classList.remove('loading');

  if (error) {
    console.error(error);
    toast(error.message, 'err');
  } else {
    toast('Conta criada! Verifique o seu e-mail para confirmar o cadastro. 🚀');
  }
}


// ── VERIFICADOR DE SESSÃO ATIVA E LIMPEZA DE URL ────────────
async function verificarSessao() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  
  if (session) {
    // Limpa o código gigante da URL sem recarregar a página
    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Se estiver na página de login (index.html), redireciona para a loja
    if (window.location.pathname.includes('index.html')) {
      toast('Sessão ativa! Redirecionando... 🎉');
      setTimeout(() => window.location.href = '../', 1200);
    }
  }
}


// ── FORGOT PASSWORD ────────────────────────────────────────
function toggleForgot(show){
  document.getElementById('forgotPanel').classList.toggle('on', show);
  document.getElementById('loginMain').style.display = show ? 'none' : 'block';
}

function sendForgot(){
  const v = document.getElementById('forgotEmail').value.trim();
  if(!v || !v.includes('@')){ toast('Digite um e-mail válido','err'); return; }
  
  simulateLoad('btnLogin', () => {
    toast('Link enviado para ' + v + ' ✉️');
    toggleForgot(false);
  });
}


// ── TOGGLE PASSWORD ────────────────────────────────────────
function togglePwd(id, btn){
  const inp = document.getElementById(id);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁';
}


// ── FIELD VALIDATION ───────────────────────────────────────
function showFieldErr(inp, msgId){
  inp.classList.add('err');
  const el = document.getElementById(msgId);
  if(el){ el.style.display = 'block'; }
}
function clearFieldErr(inp){
  inp.classList.remove('err');
  const siblings = inp.parentElement.querySelectorAll('.field-err');
  siblings.forEach(s => s.style.display = 'none');
  if(inp.value.length > 0) inp.classList.add('ok'); else inp.classList.remove('ok');
}
function validateEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }


// ── MASKS ──────────────────────────────────────────────────
function maskCPF(inp){
  let v = inp.value.replace(/\D/g,'').slice(0,11);
  if(v.length > 9) v = v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9);
  else if(v.length > 6) v = v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);
  else if(v.length > 3) v = v.slice(0,3)+'.'+v.slice(3);
  inp.value = v;
}
function maskPhone(inp){
  let v = inp.value.replace(/\D/g,'').slice(0,11);
  if(v.length > 6) v = '('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
  else if(v.length > 2) v = '('+v.slice(0,2)+') '+v.slice(2);
  inp.value = v;
}


// ── PASSWORD STRENGTH ──────────────────────────────────────
function checkPwd(v){
  const wrap = document.getElementById('pwdStrength');
  wrap.style.display = v ? 'block' : 'none';
  const r1 = v.length >= 8;
  const r2 = /[A-Z]/.test(v);
  const r3 = /[0-9]/.test(v);
  const r4 = /[^A-Za-z0-9]/.test(v);
  document.getElementById('r1').classList.toggle('ok', r1);
  document.getElementById('r2').classList.toggle('ok', r2);
  document.getElementById('r3').classList.toggle('ok', r3);
  document.getElementById('r4').classList.toggle('ok', r4);
  const score = [r1,r2,r3,r4].filter(Boolean).length;
  const bars = ['pb1','pb2','pb3','pb4'];
  const cls = ['s1','s2','s3','s4'];
  const lbls = ['Muito fraca','Fraca','Moderada','Forte'];
  bars.forEach((id,i) => {
    const b = document.getElementById(id);
    b.className = 'pwd-bar ' + (i < score ? cls[score-1] : '');
  });
  const lbl = document.getElementById('pwdLbl');
  lbl.textContent = score ? lbls[score-1] : 'Muito fraca';
  lbl.className = 'pwd-label ' + (score ? cls[score-1] : 's1');
}


// ── SIMULATE LOADING (Mantido para recuperar senha) ────────
function simulateLoad(btnId, cb, delay=1400){
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('loading');
  setTimeout(() => { if(btn) btn.classList.remove('loading'); cb(); }, delay);
}


// ── TOAST ──────────────────────────────────────────────────
function toast(msg, type='ok'){
  const t  = document.getElementById('toast1');
  const ic = document.getElementById('toastIco');
  const tx = document.getElementById('toastMsg');
  if(!t || !ic || !tx) return;
  tx.textContent = msg;
  ic.className = 'toast-ico ' + type;
  ic.textContent = type === 'ok' ? '✓' : '!';
  t.classList.add('on');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('on'), 3000);
}


// ── KEYBOARD SUBMIT ────────────────────────────────────────
document.addEventListener('keydown', e => {
  if(e.key !== 'Enter') return;
  const active = document.activeElement;
  if(document.getElementById('formLogin').classList.contains('hidden')) doRegister();
  else doLogin();
});
O código gigantesco ainda está depois do URL da tela inicial

Esse comportamento acontece por um detalhe de caminhos (rotas) no seu projeto.

No código anterior, a configuração estava mandando o Google redirecionar o usuário direto para a tela inicial (window.location.origin + '/'). Como a sua tela inicial da loja não possui o arquivo script.js rodando nela, ninguém dava o comando para o navegador limpar aquele texto gigante.

Para resolver isso de forma elegante, a melhor estratégia é fazer o Google devolver o usuário para a própria tela de login primeiro. A tela de login (que tem o script do Supabase) vai ler o código, salvar a sessão, limpar a URL instantaneamente e só depois mandar o usuário para a loja totalmente limpa.

Substitua apenas essas duas funções no seu script.js:

1. Atualize a função socialLogin
Mude o parâmetro redirectTo para capturar a URL exata da página de login atual:

JavaScript
async function socialLogin(provider) {
  toast(`Redirecionando para o ${provider}...`);
  
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: provider,
    options: {
      // ATUALIZADO: Faz voltar para esta mesma página de login para processar o código
      redirectTo: window.location.origin + window.location.pathname 
    }
  });

  if (error) {
    console.error(error);
    toast(`Erro ao conectar com ${provider}.`, 'err');
  }
}
2. Atualize a função verificarSessao
Ajuste a verificação para que ela limpe a URL assim que o Google voltar e use a presença do formulário (formLogin) para saber se deve redirecionar para a loja:

JavaScript
async function verificarSessao() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  
  if (session) {
    // 1. Limpa o código gigante da URL instantaneamente sem dar F5
    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Se o formulário de login existir na página, significa que o usuário 
    // acabou de logar, então mostramos o Toast e mandamos ele para a loja pura
    if (document.getElementById('formLogin')) {
      toast('Sessão ativa! Redirecionando... 🎉');
      setTimeout(() => window.location.href = '../', 1200);
    }
  }
}
O que vai acontecer agora?
O usuário clica em "Entrar com Google".

Ele faz o login no Google e aceita.

O Google joga ele de volta para a sua página de login (.../login/index.html?code=...).

O script.js entra em ação, o Supabase valida o usuário, a URL é limpa num piscar de olhos e a animação de "Redirecionando..." aparece.

O usuário vai para a página inicial (../) com o link perfeitamente limpo.

E como faz os dados fornecidos pelo login aparecerem certos e em cada respectivo campo nessa página, ou seja, fazer essa página realmente ser útil e funcional?

Para fazer essa página ganhar vida e preencher os dados do usuário automaticamente, precisamos criar uma "ponte" entre o banco de dados (Supabase) e os campos visuais da sua tela.

O problema atual é que os seus campos de texto (<input>) e os textos da barra lateral no seu index.html não possuem o atributo id. Sem o id, o JavaScript fica "cego" e não sabe exatamente onde injetar o nome, o e-mail ou o celular.

Além disso, para a página ser 100% útil, precisamos proteger a rota (expulsar quem não estiver logado) e fazer o botão "Salvar alterações" enviar os novos dados de volta para o Supabase.

Aqui está o passo a passo de como ajustar os dois arquivos:

1. Ajustes no arquivo index.html
Você precisará adicionar os ids nos lugares certos.

Na barra lateral (Sidebar):
Procure a parte onde está o cartão do usuário (user-card) e substitua as linhas do nome e e-mail por estas (note os ids novos):

HTML
<div class="perfilNome" id="sidebarName">Carregando...</div>
<div class="user-email" id="sidebarEmail">Buscando dados...</div>
No formulário de Informações Pessoais:
Procure a div com a classe fgrid e substitua os campos de Nome, Sobrenome, E-mail e Celular por este bloco abaixo. Eu adicionei os ids e desativei o campo de e-mail (disabled), pois alterar o e-mail exige um fluxo de segurança diferente no Supabase:

HTML
<div class="fgrid">
  <div class="fgrp"><label>Nome</label><input type="text" id="profileFirstName" class="finput" placeholder="Seu nome"></div>
  <div class="fgrp"><label>Sobrenome</label><input type="text" id="profileLastName" class="finput" placeholder="Sobrenome"></div>
  <div class="fgrp"><label>E-mail</label><input type="email" id="profileEmail" class="finput" placeholder="seu@email.com" disabled style="opacity: 0.6; cursor: not-allowed;"></div>
  <div class="fgrp"><label>Celular</label><input type="text" id="profilePhone" class="finput" oninput="maskPhone(this)" placeholder="(00) 00000-0000" maxlength="15"></div>
  
  <div class="fgrp"><label>CPF</label><input class="finput" value="" oninput="maskCPF(this)" placeholder="000.000.000-00" maxlength="14"></div>
  <div class="fgrp"><label>Data de nascimento</label><input class="finput" type="date" placeholder="01/01/1999" value=""></div>
  <div class="fgrp"><label>Gênero</label>
    <select class="fselect">
      <option>Selecione uma opção</option><option>Feminino</option><option>Masculino</option><option>Não binário</option><option>Prefiro não informar</option>
    </select>
  </div>
  <div class="fgrp"><label>Idioma</label>
    <select class="fselect"><option>Português (BR)</option><option>English</option><option>Español</option></select>
  </div>
  <div class="fgrp span2"><label>Bio / Sobre mim</label><textarea class="finput" rows="3" placeholder="Conte um pouco sobre você..."></textarea></div>
</div>
2. Ajustes no arquivo script.js
Agora que o HTML tem as "etiquetas" corretas, vamos atualizar a lógica do Supabase no final do seu script.js.

Substitua toda a parte final do seu JS (tudo que vem a partir do comentário // 2. Inicializa o banco de dados) por este código:

JavaScript
// ── SUPABASE: INICIALIZAÇÃO E AUTENTICAÇÃO ─────────────────
const SUPABASE_URL = "https://putdougjaadksnfyfbgc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UJYrU4E9UtTywzq3ghGLsQ_fRHE9nRR";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.addEventListener('DOMContentLoaded', async () => {
  // 1. Busca a sessão ativa
  const { data: { session }, error } = await supabaseClient.auth.getSession();

  // 2. Proteção de Rota: Se não estiver logado, expulsa para o login
  if (!session) {
    window.location.href = '../login/index.html'; // Ajuste este caminho se necessário
    return;
  }

  // 3. Extrai os dados do usuário
  const user = session.user;
  const meta = user.user_metadata || {};
  
  const email = user.email || "";
  const fullName = meta.full_name || "Cliente";
  const phone = meta.phone || "";

  // Divide o "Nome Completo" em Nome e Sobrenome para preencher os inputs separados
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(' ') || "";

  // 4. Injeta os dados na Barra Lateral (Sidebar)
  const sidebarName = document.getElementById('sidebarName');
  const sidebarEmail = document.getElementById('sidebarEmail');
  if (sidebarName) sidebarName.textContent = fullName;
  if (sidebarEmail) sidebarEmail.textContent = email;

  // 5. Injeta os dados no Formulário de Perfil
  const inputFirstName = document.getElementById('profileFirstName');
  const inputLastName = document.getElementById('profileLastName');
  const inputEmail = document.getElementById('profileEmail');
  const inputPhone = document.getElementById('profilePhone');

  if (inputFirstName) inputFirstName.value = firstName;
  if (inputLastName) inputLastName.value = lastName;
  if (inputEmail) inputEmail.value = email;
  if (inputPhone) {
    inputPhone.value = phone;
    maskPhone(inputPhone); // Aplica a máscara visual no número carregado
  }
});


// ── FUNÇÃO PARA SALVAR OS DADOS NO SUPABASE ─────────────────
// Substitua a sua função vazia 'saveProfile()' por esta:
async function saveProfile() {
  const firstName = document.getElementById('profileFirstName').value.trim();
  const lastName = document.getElementById('profileLastName').value.trim();
  // Pega o telefone e remove tudo que não for número antes de salvar no banco
  const phoneRaw = document.getElementById('profilePhone').value.replace(/\D/g, ''); 

  if (!firstName) {
    toast('O primeiro nome é obrigatório', 'err');
    return;
  }

  const fullName = `${firstName} ${lastName}`.trim();
  toast('Salvando informações...', 'info');

  // Atualiza os metadados do usuário no banco
  const { data, error } = await supabaseClient.auth.updateUser({
    data: { 
      full_name: fullName,
      phone: phoneRaw
    }
  });

  if (error) {
    console.error(error);
    toast('Erro ao salvar: ' + error.message, 'err');
  } else {
    toast('Perfil salvo com sucesso! ✓', 'ok');
    // Atualiza o nome na sidebar instantaneamente
    document.getElementById('sidebarName').textContent = fullName;
  }
}


// ── FUNÇÃO DE LOGOUT CORRIGIDA ──────────────────────────────
// Substitua a sua função 'doLogout()' do painel de ações por esta:
async function doLogout() { 
  toast('Saindo da conta... 👋', 'info'); 
  await supabaseClient.auth.signOut(); // Desloga do banco
  setTimeout(() => window.location.href = '../login/index.html', 1200); // Redireciona
}
O que isso resolve?
Segurança: Se um usuário sem conta tentar acessar a URL de configurações direto pelo navegador, ele será chutado de volta para a tela de login.

Separação Inteligente: O Supabase salva o full_name (Nome Completo). O código acima é esperto o suficiente para "quebrar" esse nome e colocar o primeiro nome no campo de "Nome" e o restante no campo de "Sobrenome".

Persistência Real: O botão "Salvar" agora realmente empacota o que o usuário digitou, sobe para os servidores do Supabase e atualiza a interface instantaneamente.

E por que (provavelmente mesmo logado na conta) quando acessa a página, redireciona para o login e do login automaticamente sem clicar em nada volta para o ínicio, indicando que está logado?

Esse comportamento bizarro é um clássico problema de Condição de Corrida (Race Condition) causado pela forma como o Supabase gerencia a segurança dos tokens por padrão.

O Diagnóstico: Por que esse "vai e vem" acontece?
Os tokens de acesso do Supabase (que comprovam que você está logado) duram exatamente 1 hora. Quando esse tempo passa, o token expira.

Quando você entra na sua página de perfil após esse período, acontece o seguinte fluxo invisível:

O seu código dispara o comando supabaseClient.auth.getSession() imediatamente.

O Supabase percebe internamente: "O token expirou! Vou rodar um processo em segundo plano na rede para renovar a sessão usando o Refresh Token".

O problema é que a resposta da rede demora alguns milissegundos. Como o comando getSession() é executado instantaneamente, ele lê a sessão como vazia (null) antes que a renovação em segundo plano termine.

O seu código vê que a sessão está vazia e te expulsa imediatamente para a página de login (window.location.href = '../login/index.html').

A pegadinha: Enquanto o navegador está mudando de página, a renovação do token que estava rodando em segundo plano termina com sucesso e grava o novo token válido no cache (localStorage) do seu navegador.

Ao pisar na página de login, a função verificarSessao() roda, lê o cache atualizado, vê que você está logado de verdade e te joga de volta para o início.

A Solução Definitiva: Usar o onAuthStateChange
Para matar esse bug, não devemos usar o getSession() puro dentro do carregamento da página. O próprio Supabase oferece uma ferramenta muito mais inteligente chamada onAuthStateChange, que escuta o estado real do usuário e espera pacientemente qualquer renovação de token terminar antes de tomar uma decisão.

Abra o seu arquivo script.js da página de perfil e substitua todo o bloco do window.addEventListener('DOMContentLoaded', ...) por este formato profissional:

JavaScript
// ── SUPABASE: INICIALIZAÇÃO E AUTENTICAÇÃO REAL ─────────────────
const SUPABASE_URL = "https://putdougjaadksnfyfbgc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UJYrU4E9UtTywzq3ghGLsQ_fRHE9nRR";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ESCUTADOR INTELIGENTE DE SESSÃO (Evita loops e corrige o bug do token expirado)
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  
  // O evento 'INITIAL_SESSION' garante que o Supabase já terminou de checar e renovar o token antigo
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    
    // Se REALMENTE não houver sessão após a validação completa, expulsa para o login
    if (!session) {
      window.location.href = '../login/index.html';
      return;
    }

    // USUÁRIO LOGADO COM SUCESSO! Agora preenchemos os dados com segurança:
    const user = session.user;
    const meta = user.user_metadata || {};
    
    const email = user.email || "";
    const fullName = meta.full_name || "Cliente";
    const phone = meta.phone || "";

    // Divide o "Nome Completo" em Nome e Sobrenome
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";

    // Injeta os dados na Barra Lateral (Sidebar)
    const sidebarName = document.getElementById('sidebarName');
    const sidebarEmail = document.getElementById('sidebarEmail');
    if (sidebarName) sidebarName.textContent = fullName;
    if (sidebarEmail) sidebarEmail.textContent = email;

    // Injeta os dados no Formulário de Perfil
    const inputFirstName = document.getElementById('profileFirstName');
    const inputLastName = document.getElementById('profileLastName');
    const inputEmail = document.getElementById('profileEmail');
    const inputPhone = document.getElementById('profilePhone');

    if (inputFirstName) inputFirstName.value = firstName;
    if (inputLastName) inputLastName.value = lastName;
    if (inputEmail) inputEmail.value = email;
    if (inputPhone) {
      inputPhone.value = phone;
      maskPhone(inputPhone); // Aplica a máscara visual ao carregar
    }
  }

  // Se o usuário clicar em sair, o evento SIGNED_OUT é disparado e o redireciona
  if (event === 'SIGNED_OUT') {
    window.location.href = '../login/index.html';
  }
});
Por que isso resolve 100%?
O evento INITIAL_SESSION foi criado pelo Supabase exatamente para aplicações web tradicionais. Ele segura a execução do script por aqueles milissegundos cruciais até ter certeza absoluta se o usuário tem ou não uma credencial válida ou renovável. O loop chato de redirecionamento sumirá por completo!

E se muda o nome (ou outros dados) da conta salva e muda no perfil, fica quando recarrega a página mas ao sair e entrar na conta de novo não mudou?

Esse comportamento é muito comum e acontece por dois motivos principais (um erro sutil no código atual e uma configuração de segurança padrão do Supabase).

Aqui está a explicação exata do porquê disso acontecer e como corrigir:

Motivo 1: O navegador te "engana" no F5 (Recarregar)
Quando você digita algo em um campo de texto (<input>) e simplesmente recarrega a página (F5), os navegadores modernos (como Chrome e Firefox) tentam ser inteligentes e mantêm o que você digitou no formulário para você não perder o texto caso tenha recarregado sem querer.

Isso dá a falsa impressão de que os dados foram salvos no banco de dados, mas na verdade eles só estavam guardados temporariamente na memória do seu próprio navegador. Ao sair da conta e entrar de novo, essa memória é limpa. No arquivo script.js original que você enviou, a função saveProfile estava assim:

JavaScript
function saveProfile(){ toast('Perfil salvo com sucesso! ✓'); }
Ou seja, ela apenas mostrava o aviso na tela, mas não enviava nada para os servidores do Supabase.

Motivo 2: O Google "atropela" as alterações no Login (O principal vilão)
Mesmo se você usar a função correta para atualizar os dados no Supabase (supabaseClient.auth.updateUser), o Login do Google tem um comportamento padrão: toda vez que o usuário faz login, o Supabase vai até o Google, pega o nome/foto originais de lá e grava por cima do que o usuário alterou.

Então, se o usuário se chama "João Silva" no Google, altera no seu site para "João Modificado" e depois desloga; quando ele logar de novo via Google, o Supabase puxa "João Silva" novamente e apaga a alteração.

Como resolver isso de vez?
Passo 1: Desativar o sincronismo no painel do Supabase
Para impedir que o Google mude o nome do usuário de volta toda vez que ele fizer login:

Acesse o painel do seu Supabase.

No menu lateral esquerdo, clique em Authentication (índice de chave).

Vá em Providers e clique em Google.

Procure por uma opção chamada "Sync provider metadata" (Sincronizar metadados do provedor) e DESATIVE-A (desmarque a caixinha).

Clique em Save.

Pronto! Agora o Supabase nunca mais vai deixar o Google sobrescrever o que o usuário editar no seu site.

Passo 2: Atualizar o seu script.js com a lógica de gravação real
Para fazer o botão "Salvar alterações" enviar os dados de verdade e o leitor de sessão ler tudo sem bugar, substitua toda a parte final do seu script.js (da inicialização do Supabase para baixo) por este código corrigido:

JavaScript
// ── SUPABASE: INICIALIZAÇÃO REAL ───────────────────────────
const SUPABASE_URL = "https://putdougjaadksnfyfbgc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_UJYrU4E9UtTywzq3ghGLsQ_fRHE9nRR";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ESCUTADOR DE SESSÃO: Garante o carregamento correto dos dados salvos
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (!session) {
      window.location.href = '../login/index.html';
      return;
    }

    const user = session.user;
    // IMPORTANTE: Buscamos primeiro os metadados customizados que o usuário alterou
    const meta = user.user_metadata || {};
    
    const email = user.email || "";
    const fullName = meta.full_name || "Cliente";
    const phone = meta.phone || "";

    // Divide o Nome para os inputs
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";

    // Atualiza a Sidebar
    const sidebarName = document.getElementById('perfilNome'); // ID original do seu HTML
    const sidebarEmail = document.getElementById('perfilEmail'); // ID original do seu HTML
    if (sidebarName) sidebarName.textContent = fullName;
    if (sidebarEmail) sidebarEmail.textContent = email;

    // Preenche os Inputs do Formulário
    const inputFirstName = document.getElementById('profileFirstName');
    const inputLastName = document.getElementById('profileLastName');
    const inputEmail = document.getElementById('profileEmail');
    const inputPhone = document.getElementById('profilePhone');

    if (inputFirstName) inputFirstName.value = firstName;
    if (inputLastName) inputLastName.value = lastName;
    if (inputEmail) inputEmail.value = email;
    if (inputPhone) {
      inputPhone.value = phone;
      if (typeof maskPhone === 'function') maskPhone(inputPhone);
    }
  }

  if (event === 'SIGNED_OUT') {
    window.location.href = '../login/index.html';
  }
});

// FUNÇÃO SALVAR ATUALIZADA: Grava de verdade no Supabase
async function saveProfile() {
  const inputFirstName = document.getElementById('profileFirstName');
  const inputLastName = document.getElementById('profileLastName');
  const inputPhone = document.getElementById('profilePhone');

  if (!inputFirstName || !inputFirstName.value.trim()) {
    toast('O primeiro nome é obrigatório', 'err');
    return;
  }

  const firstName = inputFirstName.value.trim();
  const lastName = inputLastName ? inputLastName.value.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  const phoneRaw = inputPhone ? inputPhone.value.replace(/\D/g, '') : "";

  toast('A guardar alterações...', 'info');

  // Comando real que salva nos metadados da conta do Supabase
  const { data, error } = await supabaseClient.auth.updateUser({
    data: { 
      full_name: fullName,
      phone: phoneRaw
    }
  });

  if (error) {
    console.error(error);
    toast('Erro ao salvar: ' + error.message, 'err');
  } else {
    toast('Perfil guardado com sucesso! ✓', 'ok');
    
    // Atualiza o nome na barra lateral imediatamente sem precisar dar F5
    const sidebarName = document.getElementById('perfilNome');
    if (sidebarName) sidebarName.textContent = fullName;
  }
}
    
  // Se o usuário clicar em sair, o evento SIGNED_OUT é disparado e o redireciona
  if (event === 'SIGNED_OUT') {
    window.location.href = '../login/index.html';
  }
});
      
// FUNÇÃO DE LOGOUT
async function doLogout() { 
  toast('A terminar sessão... 👋', 'info'); 
  await supabaseClient.auth.signOut();
}
