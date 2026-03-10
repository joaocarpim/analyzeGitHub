
---

# ESTUDO DE CASO — AnalyzeGitHub

### 🚀 Projeto funcionando

<details>
  <summary>📸 Ver demonstração</summary>

  <br />

  <img src="./src/assets/analyzergithub.gif" alt="Demonstração do projeto" />

## [ Acesso ao Projeto 👈](https://analyzegithub.vercel.app/) 
</details>

## Contexto e Problema
Muitos desenvolvedores possuem GitHub ativo, mas **não sabem como ele é percebido por recrutadores**.  
Perguntas comuns:

- Meu GitHub está bom para o mercado?
- O que falta para eu ser contratado?
- Meu perfil parece iniciante ou profissional?
- Estou evoluindo ao longo do tempo?

As ferramentas existentes focam apenas em métricas superficiais (stars, commits), sem contexto humano ou estratégico.

---

## Objetivo do Projeto

Criar uma plataforma que:

- Analise perfis do GitHub de forma **inteligente**
- Gere feedback claro, direto e acionável
- Simule a visão de um recrutador real
- Acompanhe a evolução do desenvolvedor

Tudo isso de forma acessível, rápida e sem exigir login.

---

## Solução Proposta

O **AnalyzeGitHub** combina:
- Dados reais do GitHub
- Inteligência Artificial com prompt avançado
- Visualização clara de resultados

A aplicação gera:
- Diagnóstico técnico
- Score de empregabilidade
- Roadmap personalizado
- Histórico de evolução

---

## Decisões Técnicas

### 🔹 Frontend
- React + TypeScript para segurança e escalabilidade
- Recharts para visualização de evolução
- Componentização clara e reutilizável

### 🔹 IA
- Uso da **Groq API** por performance e custo
- Modelo LLaMA 3
- Prompt dividido por modos de análise
- Extração estruturada de score via texto

### 🔹 Infra
- Vercel para deploy contínuo
- Serverless Functions para backend
- Sem banco de dados (MVP lean)

---

## Desafios Enfrentados

- Limitações de APIs gratuitas
- Prompt engineering para respostas úteis
- Extração confiável de score
- Garantir build estável no Vercel
- Balancear crítica dura sem ser ofensivo

Todos os desafios foram resolvidos com:
- Logs estruturados
- Tipagem forte
- Refatoração incremental
- Testes manuais reais

---

## Resultado

- Aplicação funcional e pública
- Feedback claro e diferenciado
- Projeto facilmente escalável
- Demonstra domínio de:
  - Frontend moderno
  - Integração com IA
  - Arquitetura serverless

---

## 🏁 Conclusão

O **AnalyzeGitHub** não é apenas um analisador de perfil —  
é uma ferramenta de **autoconhecimento profissional para desenvolvedores**.

---

## Desenvolvido por:
- [JoãoV Carpim](https://github.com/joaocarpim)  

---
