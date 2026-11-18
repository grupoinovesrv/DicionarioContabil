# Dicionário Contábil Interno | Grupo Inove

Aplicação estática para consulta de termos contábeis, fiscais e empresariais. Funciona sem backend e está pronta para hospedagem em subdiretórios do GitHub Pages.

## Conteúdo migrado

A fonte principal foi o dicionário publicado no Canva em <https://kawateste.my.canva.site/dicionario>, extraído em 18/11/2026.

- 36 cards foram encontrados no material de origem.
- 43 registros pesquisáveis foram gerados após individualizar conceitos agrupados.
- Foram separados: PGDAS-D/DAS, PIS/COFINS, IBS/CBS, CST/CSOSN, SPED Fiscal/EFD-Contribuições, Balanço Patrimonial/Balancete e AVCB/CLCB.
- Nenhum termo dos 36 cards originais foi descartado.
- Regras, prazos, limites e temas em transição foram redigidos de forma conceitual e marcados como `revisaoTecnica: "pendente"` quando precisam de validação profissional.

Contagem atual por categoria:

| Categoria | Termos |
|---|---:|
| Fiscal e Tributário | 17 |
| Obrigações e Declarações | 8 |
| Legalização Empresarial | 10 |
| Contabilidade | 3 |
| Regimes Tributários | 3 |
| Reforma Tributária | 2 |
| **Total** | **43** |

> A tabela acima é conferida automaticamente no checklist de validação. Se o JSON for alterado, atualize esta documentação com a contagem gerada pelo teste.

## Executar localmente

### Windows — forma mais simples

Dê dois cliques em **`INICIAR DICIONÁRIO.cmd`**. O navegador será aberto automaticamente. Mantenha a janela do inicializador aberta durante o uso e feche-a quando terminar.

Não abra `index.html` diretamente: navegadores bloqueiam o carregamento do JSON pelo protocolo `file://`.

### Outras opções

Inicie um servidor estático na pasta do projeto:

```powershell
python -m http.server 8000
```

Depois acesse <http://localhost:8000/>.

Alternativas:

```powershell
py -m http.server 8000
```

ou, se já tiver Node.js:

```powershell
npx serve .
```

## Manutenção do conteúdo

### Adicionar um termo

1. Abra `data/termos.json`.
2. Adicione um objeto ao array `termos` seguindo a estrutura existente.
3. Use um `id` único, estável, minúsculo e sem acentos.
4. Use exatamente o nome de uma categoria cadastrada em `categorias`.
5. Informe apenas IDs existentes em `termosRelacionados`.
6. Defina `revisaoTecnica` como `pendente` até a validação de um responsável.
7. Execute as verificações descritas na seção “Checklist”.

### Alterar uma definição

Edite os campos `resumo`, `definicao` e, quando pertinente, `exemploPratico`. Preserve o sentido técnico, registre uma fonte verificável no campo `fonte` quando houver e atualize `meta.ultimaRevisao` somente na data em que a revisão realmente acontecer.

### Criar uma categoria

1. Adicione a categoria ao array `categorias`, com `nome`, `rotulo` e `cor` hexadecimal.
2. Use o mesmo `nome` no campo `categoria` dos termos correspondentes.
3. Categorias sem termos aparecem desativadas nos filtros.

### Revisar o conteúdo

- Procure por `"revisaoTecnica": "pendente"`.
- Confirme prazos, limites, obrigatoriedade, transições legais e terminologia com a equipe técnica.
- Não transforme exemplos internos em regras gerais.
- Após validação, altere o status para `revisada` e atualize a data real da revisão.

## Publicar no GitHub Pages

1. Crie um repositório e envie todo o conteúdo desta pasta para a branch principal.
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**.
4. Escolha a branch principal e a pasta `/ (root)`.
5. Salve e aguarde o endereço publicado pelo GitHub.

Todos os caminhos são relativos; por isso, o site funciona em endereços como `https://usuario.github.io/repositorio/`. O roteamento de termos usa hash (`#/termo/id`) e não exige configuração de redirecionamento.

### Publicar uma nova versão

1. Revise os dados e execute o checklist.
2. Atualize `meta.versao` e a data real em `meta.ultimaRevisao`.
3. Registre as mudanças no Git e envie para a branch publicada.
4. Após o deploy, teste a página publicada e um link individual de termo.

## Solução de problemas

- **Os termos não carregam localmente:** use um servidor HTTP; não abra `index.html` diretamente.
- **Erro 404 no JSON ou CSS:** confirme a capitalização dos nomes e preserve os caminhos relativos.
- **Página publicada sem atualização:** aguarde o deploy do GitHub Pages e faça uma recarga sem cache.
- **Link individual não abre:** use o formato `#/termo/dre` e confirme se o ID existe no JSON.
- **Favoritos desapareceram:** eles ficam somente no `localStorage` do navegador e do domínio atual; outro dispositivo, navegador ou domínio terá uma lista própria.
- **Categoria não aparece ativa:** confirme se o nome no termo é idêntico ao nome cadastrado no array `categorias`.

## Checklist de validação

Execute as verificações automatizadas sem instalar dependências:

```powershell
npm test
```

- [x] JSON válido, IDs únicos e relações existentes (teste automatizado).
- [x] Contagem de termos por categoria conferida (teste automatizado).
- [x] Busca por `DRE` prioriza DRE (automatizado e navegador).
- [x] Busca por `balanco` encontra Balanço Patrimonial (automatizado e navegador).
- [x] Busca por `alteracao` encontra termos relacionados (teste automatizado).
- [x] Filtro Legalização + busca `CNAE` prioriza CNAE (teste automatizado).
- [x] Palavra inexistente exibe o estado vazio (automatizado e navegador).
- [x] Link `#/termo/dre` abre diretamente o painel de DRE (navegador).
- [x] Favorito permanece após recarregar a página no mesmo navegador.
- [x] Painel fecha com `Esc`.
- [x] Layout conferido em desktop e celular (390 × 844 px), sem rolagem horizontal da página.
- [ ] Layout em tablet — requer conferência visual adicional antes da publicação.
- [ ] Botões “Copiar definição” e “Copiar link” — requerem conferência no domínio HTTPS publicado.
- [x] Console do navegador sem erros nos fluxos testados.

## Privacidade e segurança

O GitHub Pages é público. Não inclua senhas, dados de clientes, documentos confidenciais, informações financeiras privadas ou credenciais. Caso o conteúdo precise ser restrito, use uma hospedagem com autenticação e controle de acesso reais.
