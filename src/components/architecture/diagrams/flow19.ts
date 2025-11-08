export const flow19 = `flowchart TD
  %% Groups
  subgraph "Client & Ingress"
    L1[Client Layer]
    L2[Edge & Ingress]
    L3[API Gateway]
  end

  subgraph "Security & Auth"
    L4[Modern Safety]
    L5[Auth & Session]
    L6[Supply Chain Security]
  end

  subgraph "Services"
    L7[BFF Layer]
    L8[Business Logic]
    L9[AI Agents]
  end

  subgraph "External Communication"
    L10[Egress Gateway]
    L11[Retry Scheduler]
    L12[Control Plane]
  end

  subgraph "Messaging & Notifications"
    L13[Notification Amplifier]
    L14[Event Bus]
  end

  subgraph "Data & Storage"
    L15[Database]
    L16[Storage]
    L17[Public Data Plane]
    L18[Private Data Plane]
    L19[Backup & DR]
  end

  %% Flows
  L1 --> L2
  L2 --> L3
  L3 --> L4
  L4 --> L5
  L5 --> L6
  L6 --> L7
  L7 --> L8
  L8 --> L9
  L8 --> L10
  L10 -.-> L11
  L11 -.-> L12
  L8 --> L15
  L15 --> L17
  L15 --> L18
  L15 --> L16
  L16 -.-> L19
  L8 -.-> L14
  L14 -.-> L13
  L13 -.-> L1
`;
