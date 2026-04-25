# Contract Risk Explainer

## Project Summary

Contract Risk Explainer is an explainable AI tool that analyzes contracts and highlights potentially risky clauses while showing why they are considered risky. Instead of acting as a black box, the system provides transparent reasoning by identifying influential words, assigning risk scores, and generating human-readable explanations. This helps users understand legal risks faster and build trust in AI-assisted contract analysis.

---

## Project Description

Contracts often contain complex language, hidden obligations, and ambiguous clauses that are difficult to interpret without legal expertise. While large language models can summarize contracts, they typically do not explain how they reached their conclusions. This lack of transparency makes it difficult for users to trust AI-generated legal insights.

Contract Risk Explainer addresses this problem by combining LLM-based contract analysis with explainability techniques. The system splits a contract into clauses, evaluates each clause for potential risks, and highlights problematic sections. It then uses attribution methods to identify which parts of the text influenced the risk decision. Users can click on a clause to view explanations, risk scores, and highlighted keywords that contributed to the assessment.

The result is an interactive and transparent contract analysis tool that helps users understand not only what is risky, but also why it is risky.

---

## Project Goals
**Primary Goals**
- Build a working proof-of-concept for explainable contract risk analysis
- Identify and highlight risky clauses in legal text
- Provide transparent explanations for each risk detection
- Show which words influenced the AI decision
- Deliver an interactive and easy-to-understand UI
  
**Secondary Goals**
- Assign risk scores to clauses (low / medium / high)
- Provide overall contract risk summary
- Allow users to click clauses for detailed explanations
- Visualize token importance using attribution methods
- Keep the system fast and usable in real-world scenarios
- Real-World Impact
- Help non-lawyers understand contracts quickly
- Increase trust in AI-assisted legal tools
- Improve transparency in automated decision systems
- Reduce risk in business agreements and negotiations
- Demonstrate explainable AI for high-stakes decision making

---

## One-Sentence Pitch

Contract Risk Explainer is an explainable AI system that highlights risky contract clauses and shows exactly why they are risky, turning legal black boxes into transparent, understandable decisions.

---

## Start the project
cd backend
uvicorn app.main:app --reload

cd frontend
npx ng serve

---

## Flowchart

```mermaid
flowchart LR
    subgraph Input
        A[Contract Text]
    end

    subgraph Processing
        B[Clause Splitter]
        C[LLM Risk Classifier]
        D[llmSHAP Explainer]
        E[Explanation Builder]
    end

    subgraph Output
        F[Risk Highlights]
        G[Confidence Score]
        H[Explanation Panel]
        I[Token Attribution Heatmap]
    end

    A --> B
    B --> C
    B --> D
    C --> E
    D --> E
    E --> F
    E --> G
    E --> H
    D --> I
    ```
