# Contract Risk Explainer

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
