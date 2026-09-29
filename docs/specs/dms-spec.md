# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web para que usuários identificados na requisição enviem, consultem e baixem documentos, com arquivos armazenados localmente e metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao identificador de usuário informado.
- Download de um documento pelo identificador, limitado ao usuário informado.
- Interface web para upload, listagem e download.
- Armazenamento dos arquivos no filesystem local em `backend/storage`, usando Multer com `diskStorage`.
- Metadados mantidos em memória durante a execução do processo.

### Fora do escopo

- Armazenamento externo, em nuvem ou em banco de dados.
- Persistência dos metadados após reinicialização do processo.
- Autenticação, autorização robusta, cadastro de usuários ou prova de identidade.
- Exclusão, edição, compartilhamento ou versionamento de documentos.
- Restrições de tipo MIME ou extensão de arquivo.
- Paginação, busca e filtros adicionais na listagem.

> `X-User-Id` é um identificador fornecido pelo cliente e serve somente para separar os documentos no escopo funcional do MVP. Como não existe autenticação, o valor pode ser forjado e não deve ser tratado como controle de segurança.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | A aplicação deve aceitar um arquivo por requisição de upload, enviado como `multipart/form-data` no campo `file`. |
| RF-02 | O upload deve exigir `X-User-Id` não vazio e associar o documento ao valor normalizado desse header. |
| RF-03 | O upload deve aceitar qualquer tipo de arquivo, desde que não esteja vazio e tenha no máximo 10 MiB (10.485.760 bytes). |
| RF-04 | A aplicação deve gerar um identificador UUID para cada documento e armazenar o arquivo com nome gerado pelo servidor, sem usar o nome original como caminho. |
| RF-05 | Após o upload bem-sucedido, a aplicação deve retornar os metadados públicos do documento criado. |
| RF-06 | A listagem deve exigir `X-User-Id` e retornar somente documentos cujo `owner` corresponda ao valor normalizado do header. |
| RF-07 | A listagem deve ordenar os documentos por `uploadedAt` decrescente; em caso de empate, por `id` crescente. Uma lista sem resultados deve ser retornada como lista vazia. |
| RF-08 | O download deve exigir `X-User-Id` e retornar o conteúdo do documento somente quando seu proprietário corresponder ao header. |
| RF-09 | Documento inexistente e documento pertencente a outro usuário devem produzir a mesma resposta 404, sem revelar a existência ou o proprietário do documento. |
| RF-10 | A interface deve permitir enviar um arquivo, consultar a lista do usuário configurado para a sessão da interface e iniciar o download de um documento listado, apresentando estados de carregamento, sucesso e erro. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local da aplicação, em `backend/storage`, usando Multer com `diskStorage`. Não utilizar serviços ou provedores externos. |
| RNF-02 | Os metadados dos documentos devem permanecer em memória e incluir `id`, `originalName`, `size`, `uploadedAt` e `owner`. |
| RNF-03 | A aplicação deve usar configuração por variáveis de ambiente quando aplicável; `PORT` define a porta HTTP e mantém o valor padrão já adotado pelo seed quando ausente. |
| RNF-04 | O limite máximo de upload é 10 MiB por arquivo. Arquivos maiores devem ser rejeitados com status 413 e sem deixar um arquivo parcial disponível como documento. |
| RNF-05 | Nomes de arquivo enviados pelo cliente não devem determinar caminhos locais. O nome de armazenamento deve ser gerado pelo servidor para evitar sobrescrita e traversal de diretórios. |
| RNF-06 | Erros retornados pela API não devem expor stack traces, caminhos locais ou detalhes internos do filesystem. |
| RNF-07 | A implementação deve seguir a Clean Architecture simples do projeto: `routes -> controllers -> services -> repositories`, com dependências apontando para dentro. |
| RNF-08 | O backend deve permanecer em Node.js e Express com CommonJS; o frontend, em React e Vite com ESM; testes de backend, com `node:test`. |

### Efeito de reinicialização

Como os metadados ficam somente em memória, reiniciar o processo remove o catálogo de documentos. Os arquivos já gravados podem continuar em `backend/storage`, mas não serão listáveis nem baixáveis pelo sistema sem seus metadados. Limpeza e recuperação desses arquivos não fazem parte do MVP.

## 5. Modelo de dados

### Metadados públicos do documento

Este objeto é retornado pela API; caminhos locais e nomes internos de armazenamento nunca são expostos.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | UUID gerado pelo servidor e identificador do documento. |
| `originalName` | string | Sim | Nome original informado no upload, tratado como metadado e não usado como caminho de armazenamento. |
| `size` | number | Sim | Tamanho do arquivo em bytes, como inteiro maior que zero e limitado a 10.485.760. |
| `uploadedAt` | string | Sim | Data e hora do upload em ISO 8601, normalizada para UTC (por exemplo, `2026-09-29T14:30:00.000Z`). |
| `owner` | string | Sim | Valor não vazio de `X-User-Id`, removidos espaços nas extremidades. É um identificador declarativo, não autenticado. |

### Registro interno e arquivo

- O catálogo em memória associa cada `id` aos metadados públicos do documento.
- O arquivo é salvo em `backend/storage` com nome de armazenamento gerado a partir do UUID, sem extensão ou nome fornecido pelo cliente. O caminho é derivado pelo backend a partir do identificador validado.
- Os campos internos usados pelo Multer ou pelo repositório, como caminho temporário/destino, não fazem parte da resposta da API.
- O tamanho registrado deve corresponder ao arquivo efetivamente recebido. O nome original não é confiável para compor caminhos ou cabeçalhos sem codificação apropriada.
- Se o registro em memória não puder ser criado depois da gravação do arquivo, a aplicação deve tentar remover o arquivo recém-gravado para não deixar um upload parcialmente concluído.

## 6. Contratos de API

### Convenções

- Os caminhos abaixo são os caminhos do backend. O frontend deve chamá-los com o prefixo `/api`; o proxy do Vite remove esse prefixo ao encaminhar a requisição ao backend.
- `X-User-Id` é obrigatório nas três operações. Deve conter um valor não vazio após a remoção de espaços nas extremidades.
- As respostas de erro usam `Content-Type: application/json; charset=utf-8` e o formato `{ "error": { "code": "...", "message": "..." } }`.
- Nenhum endpoint exige autenticação nesta fase.

### `POST /upload`

**Requisição**

- Header: `X-User-Id: <identificador do usuário>`.
- Header: `Content-Type: multipart/form-data` com boundary definido pelo cliente HTTP.
- Parte obrigatória: `file`, contendo um único arquivo.
- Não há filtro por MIME type ou extensão. Arquivo vazio, campo ausente, campos de arquivo inesperados ou multipart inválido são rejeitados.

**Sucesso: `201 Created`**

```json
{
  "document": {
    "id": "2e9b8b2d-4572-4d0f-9a6b-e47c2479ad01",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-09-29T14:30:00.000Z",
    "owner": "usuario-123"
  }
}
```

**Erros**

| Status | Código | Situação |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Header ausente/vazio, arquivo ausente/vazio ou requisição multipart inválida. |
| 413 | `FILE_TOO_LARGE` | Arquivo acima de 10 MiB. |
| 500 | `INTERNAL_ERROR` | Falha inesperada ao gravar arquivo ou registrar metadados. |

### `GET /documents`

**Requisição**

- Header obrigatório: `X-User-Id: <identificador do usuário>`.
- Sem parâmetros de consulta no MVP.

**Sucesso: `200 OK`**

```json
{
  "documents": [
    {
      "id": "2e9b8b2d-4572-4d0f-9a6b-e47c2479ad01",
      "originalName": "relatorio.pdf",
      "size": 2048,
      "uploadedAt": "2026-09-29T14:30:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

Sem documentos para o proprietário, retornar `200 OK` com `{"documents": []}`. A resposta contém somente os metadados públicos e respeita a ordenação definida em RF-07.

**Erro**

| Status | Código | Situação |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Header `X-User-Id` ausente ou vazio. |
| 500 | `INTERNAL_ERROR` | Falha inesperada ao consultar o repositório. |

### `GET /documents/:id/download`

**Requisição**

- Header obrigatório: `X-User-Id: <identificador do usuário>`.
- `:id` é o UUID retornado no upload/listagem.

**Sucesso: `200 OK`**

- Corpo: bytes originais do arquivo, sem envelope JSON.
- `Content-Type: application/octet-stream`.
- `Content-Disposition: attachment`, usando o nome original codificado adequadamente como nome sugerido ao cliente.
- `Content-Length` igual ao tamanho registrado.

**Erros**

| Status | Código | Situação |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Header `X-User-Id` ausente ou vazio, ou identificador malformado. |
| 404 | `DOCUMENT_NOT_FOUND` | Identificador inexistente, documento de outro proprietário ou arquivo local indisponível. |
| 500 | `INTERNAL_ERROR` | Falha inesperada de leitura do filesystem. |

O status e o corpo para um documento de outro proprietário devem ser indistinguíveis dos de um identificador inexistente.

### Formato de erro

Exemplo para validação:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Informe um usuário e um arquivo válido."
  }
}
```

As mensagens podem ser localizadas em português. Respostas 500 devem usar mensagem genérica e nunca incluir detalhes internos.

## 7. Decisões arquiteturais

- Backend organizado em `routes/`, `controllers/`, `services/` e `repositories/`, com fluxo `routes -> controllers -> services -> repositories`.
- `routes/` declara os caminhos e conecta middlewares e controllers. O middleware Multer com `diskStorage` fica na borda HTTP, valida a recepção do arquivo e grava-o no diretório local configurado para o projeto.
- `controllers/` valida a entrada HTTP, lê `X-User-Id`, converte os dados da requisição em chamadas de serviço e monta status, headers e respostas HTTP.
- `services/` implementa regras de negócio: validações de domínio, associação ao proprietário, limite de tamanho, listagem ordenada e autorização funcional do download por correspondência de owner.
- `repositories/` mantém os metadados em memória e localiza/lê arquivos no filesystem local. O service recebe dados simples e não depende de objetos Express.
- O identificador UUID serve também de nome interno de armazenamento, mantendo o nome original apenas nos metadados.
- O frontend usa componentes funcionais React e um serviço de API baseado em `fetch`, chamando `/api` conforme o proxy existente no Vite.
- Não introduzir banco de dados, armazenamento remoto, provedor externo ou mecanismo de autenticação nesta fase.
- `PORT` é configurável por ambiente. O armazenamento permanece no diretório local definido pelo projeto, `backend/storage`.

## 8. Plano de execução

As etapas abaixo são um roteiro para trabalho futuro; esta especificação não inclui a execução nem a criação de arquivos de implementação.

1. **Preparar o backend:** definir configuração da aplicação, tratamento centralizado dos erros HTTP e inicialização/garantia do diretório `backend/storage`; configurar Multer `diskStorage`, UUID como nome interno e limite de 10 MiB.
2. **Implementar o repositório:** criar operações de metadados em memória para registrar, listar por owner e buscar por id/owner; derivar caminhos internos com segurança e oferecer leitura/limpeza do arquivo local.
3. **Implementar o serviço:** aplicar validações e regras de upload, ordenação da listagem, verificação de proprietário no download e compensação de arquivo quando o registro falhar.
4. **Implementar controllers e routes:** expor os três endpoints, conectar Multer e serviço, mapear erros para os status/envelopes documentados e transmitir o download como anexo.
5. **Testar o backend:** cobrir upload válido e inválido, limite e arquivo vazio, isolamento por owner, ordenação/vazio da listagem, download binário, 404 indistinguível e falhas de filesystem; usar diretório temporário nos testes e limpá-lo ao final.
6. **Implementar o frontend:** criar serviço `fetch` para `/api`, interface para upload/listagem/download, identificação de usuário adequada ao MVP e estados de carregamento, sucesso e erro; tratar respostas não-2xx sem perder mensagens úteis.
7. **Integrar e validar:** executar testes backend, build frontend e verificação manual dos fluxos via proxy Vite; confirmar respostas, headers, limite de arquivo e comportamento com lista vazia e erros. Não considerar autenticação real nem recuperação de metadados após reinício como critérios de aceite desta fase.