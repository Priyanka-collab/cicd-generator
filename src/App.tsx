import React, { useState } from "react";
import "./styles.css";

const stages = [
  { name: "Checkout Repo" },
  { name: "Install Dependencies", options: ["npm", "pip", "Maven", "Gradle"] },
  { name: "Linting", options: ["ESLint", "Flake8"] },
  { name: "Unit Test" },
  { name: "Integration Test" },
  { name: "SonarQube Scan" },
  { name: "Secrets Scan", options: ["Gitleaks", "TruffleHog"] },
  { name: "Dependency Scan", options: ["OWASP", "Snyk"] },
  { name: "Docker Build & Push" },
  { name: "Helm Deploy" },
  { name: "Serverless Deploy", options: ["AWS Lambda", "Azure Functions", "GCP Cloud Functions"] },
  { name: "Manual Approval" },
  { name: "Deploy", options: ["Kubernetes", "OpenShift", "AWS EC2", "Azure Web App"] },
  { name: "Slack Notification" },
];

export default function CICDGenerator() {
  const [selectedStages, setSelectedStages] = useState<Record<string, string | null>>({});
  const [yamlOutput, setYamlOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  const handleStageChange = (stageName: string, value: string | null) => {
    setSelectedStages((prev) => ({
      ...prev,
      [stageName]: value,
    }));
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
    document.documentElement.classList.toggle("dark", !darkMode);
  };

  const generateYAML = async () => {
    if (!openRouterKey) {
      alert("Missing OpenRouter API key. Please add it to your .env file.");
      return;
    }

    setLoading(true);
    const prompt = `
Act as a DevOps engineer.

Create a complete .gitlab-ci.yml file with:
- Full job scripts (npm, mvn, sonar, docker, k8s, etc.)
- Shell commands per job
- Caching where appropriate
- Parallel execution where possible
- YAML only as output

Inputs:
${Object.entries(selectedStages)
      .map(([stage, tool]) => `- ${stage}: ${tool}`)
      .join("\n")}
`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();

      if (response.status !== 200 || data.error) {
        const errorMsg = data?.error?.message || "Something went wrong.";
        setYamlOutput(`❌ Error: ${errorMsg}`);
        return;
      }

      setYamlOutput(data.choices[0].message.content);
    } catch (error) {
      console.error("Fetch error:", error);
      setYamlOutput("❌ Failed to connect to OpenRouter API.");
    } finally {
      setLoading(false);
    }
  };

  const downloadYAML = () => {
    const element = document.createElement("a");
    const file = new Blob([yamlOutput], { type: "text/yaml" });
    element.href = URL.createObjectURL(file);
    element.download = ".gitlab-ci.yml";
    document.body.appendChild(element);
    element.click();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(yamlOutput);
  };

  return (
    <div className={`container ${darkMode ? "dark" : ""}`}>
      <div className="toggle-theme">
        <label>
          <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} /> Toggle Dark Mode
        </label>
      </div>

      {/* Left side: Stage selection */}
      <div className="panel">
        <h1 className="title">CI/CD Pipeline Generator</h1>
        {stages.map((stage) => (
          <div key={stage.name} className="stage">
            <label>
              <input
                type="checkbox"
                onChange={(e) =>
                  handleStageChange(stage.name, e.target.checked ? stage.options?.[0] || "Enabled" : null)
                }
              />
              {stage.name}
            </label>
            {selectedStages[stage.name] && stage.options && (
              <select
                onChange={(e) => handleStageChange(stage.name, e.target.value)}
                value={selectedStages[stage.name] || ""}
              >
                {stage.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
        <button className="btn-generate" onClick={generateYAML} disabled={loading}>
          {loading ? "Generating..." : "Generate YAML"}
        </button>
      </div>

      {/* Right side: YAML output */}
      <div className="panel output">
        <h2 className="subtitle">Generated .gitlab-ci.yml</h2>
        <textarea
          rows={30}
          value={yamlOutput}
          readOnly
          className="textarea"
        />
        {yamlOutput && (
          <div className="actions">
            <button className="btn-copy" onClick={copyToClipboard}>
              Copy YAML
            </button>
            <button className="btn-download" onClick={downloadYAML}>
              Download YAML
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
