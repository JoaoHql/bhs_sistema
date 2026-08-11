# Manual: Conexao com Supabase para Alimentar Dados

Este manual explica como conectar este projeto ao banco PostgreSQL do Supabase e executar o seed de dados fake.

## Banco alvo

- Projeto Supabase: `JoaoHql's Project`
- Host: `db.txnkyneyvngyswoxqhsl.supabase.co`
- Porta: `5432`
- Banco: `postgres`
- Usuario: `postgres`
- Schema alimentado: `tenant_bhs_demo`

A senha nao fica registrada neste arquivo. Use a senha fornecida pelo responsavel do projeto somente na variavel de ambiente local.

## Pre-requisitos

Na raiz do projeto, confirme que Python e a dependencia `psycopg` estao disponiveis:

```powershell
python --version
python -c "import psycopg; print('psycopg OK')"
```

Se a dependencia nao estiver instalada:

```powershell
python -m pip install "psycopg[binary]"
```

## Configurar a conexao no PowerShell

Substitua `<SENHA>` pela senha do usuario `postgres`. O parametro `sslmode=require` exige conexao criptografada:

```powershell
$env:BHS_DATABASE_URL = 'postgresql://postgres:<SENHA>@db.txnkyneyvngyswoxqhsl.supabase.co:5432/postgres?sslmode=require'
```

Se a senha tiver caracteres especiais, aplique URL encoding nela antes de montar a URL. Exemplos: `@` vira `%40`, `#` vira `%23` e `%` vira `%25`.

Para confirmar que a variavel existe sem exibir a senha:

```powershell
if ($env:BHS_DATABASE_URL) { 'BHS_DATABASE_URL configurada' } else { 'BHS_DATABASE_URL ausente' }
```

Essa configuracao vale apenas para a janela atual do PowerShell. Nao coloque a URL em commit, log, frontend ou arquivo publico.

## Executar o seed

Execute a partir da raiz `C:\projetos\bruno\bhs_sistema\Modelo`:

```powershell
python ops\seed_fake_data.py
```

O script cria, caso ainda nao existam, o schema e estas tabelas:

- `tenant_bhs_demo.dim_calendar`
- `tenant_bhs_demo.sales_orders`
- `tenant_bhs_demo.finance_transactions`

Depois, ele remove os dados anteriores dessas tabelas e insere:

- 30 dias em `dim_calendar`
- 25 pedidos em `sales_orders`
- 20 transacoes em `finance_transactions`

Portanto, a execucao e adequada para dados de teste, mas nao deve ser usada contra dados reais sem backup e autorizacao.

## Validar no Supabase

No SQL Editor do projeto, execute:

```sql
select 'dim_calendar' as tabela, count(*) as registros
from tenant_bhs_demo.dim_calendar
union all
select 'sales_orders', count(*)
from tenant_bhs_demo.sales_orders
union all
select 'finance_transactions', count(*)
from tenant_bhs_demo.finance_transactions;
```

Resultado esperado apos uma execucao normal:

```text
dim_calendar            30
sales_orders            25
finance_transactions    20
```

No Table Editor, selecione o schema `tenant_bhs_demo` e abra as tres tabelas para visualizar os registros.

## Diagnostico rapido

### Erro de conexao

Verifique host, senha, porta `5432`, acesso de rede e se `BHS_DATABASE_URL` foi configurada na mesma janela do PowerShell usada para executar o script.

### Erro de autenticacao

Redefina a senha do usuario `postgres` no Supabase e atualize a variavel local. Se a senha possuir caracteres especiais, use URL encoding.

### Tabelas nao aparecem no Table Editor

Confirme que o schema selecionado e `tenant_bhs_demo` e atualize a pagina. O seed usa schema separado do `public`.

### A aplicacao nao acessa as tabelas pela API

Este seed usa conexao PostgreSQL direta. O schema `tenant_bhs_demo` foi definido como privado no projeto; nao exponha as tabelas publicamente sem revisar grants e RLS.

## Seguranca

- Nunca compartilhe a URL completa da conexao.
- Nunca use a senha em codigo-fonte ou frontend.
- Se a senha foi exposta em chat, terminal, log ou commit, faca a rotacao no Supabase.
- Prefira uma variavel de ambiente ou um gerenciador de segredos para execucoes automatizadas.
