import React, { useState } from "react";

const stages = [
  { name: "Build", options: ["Maven", "Gradle", "npm", "pip"] },
  { name: "Test" },
  { name: "SonarQube Scan" },
  { name: "Docker Build & Push" },
  { name: "SAST Scan" },
  { name: "DAST Scan" },
  { name: "Manual Approval" },
  { name: "Deploy", options: ["Kubernetes", "OpenShift", "AWS"] },
];

export default function CICDGenerator() {
  const [selectedStages, setSelectedStages] = useState({});
  const [yamlOutput, setYamlOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  const handleStageChange = (stageName, value) => {
    setSelectedStages((prev) => ({
      ...prev,
      [stageName]: value,
    }));
  };

  const generateYAML = async () => {
    if (!openRouterKey) {
      alert("Missing OpenRouter API key. Please add it to your .env file.");
      return;
    }

    setLoading(true);
    const prompt = `Generate a GitLab CI YAML pipeline with the following configuration:\n\n${Object.entries(selectedStages)
      .map(([stage, value]) => `${stage}: ${value}`)
      .join("\n")}\n\nOnly return valid .gitlab-ci.yml content.`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct", // free model on OpenRouter
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      console.log("OpenRouter Response:", data);

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

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
        CI/CD Pipeline Generator
      </h1>

      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
        {stages.map((stage) => (
          <div key={stage.name} style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "500" }}>
              <input
                type="checkbox"
                style={{ marginRight: "0.5rem" }}
                onChange={(e) =>
                  handleStageChange(stage.name, e.target.checked ? stage.options?.[0] || "Enabled" : null)
                }
              />
              {stage.name}
            </label>
            {selectedStages[stage.name] && stage.options && (
              <select
                style={{ marginLeft: "1rem", padding: "0.3rem", borderRadius: "4px" }}
                onChange={(e) => handleStageChange(stage.name, e.target.value)}
                value={selectedStages[stage.name]}
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
        <button
          onClick={generateYAML}
          disabled={loading}
          style={{
            backgroundColor: "#2563eb",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate YAML"}
        </button>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          Generated .gitlab-ci.yml
        </h2>
        <textarea
          rows={20}
          value={yamlOutput}
          readOnly
          style={{ width: "100%", fontFamily: "monospace", fontSize: "0.875rem", padding: "1rem" }}
        />
        {yamlOutput && (
          <button
            onClick={downloadYAML}
            style={{
              marginTop: "1rem",
              backgroundColor: "#10b981",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Download YAML
          </button>
        )}
      </div>
    </div>
  );
}
