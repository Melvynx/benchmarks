import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MailProvider } from "./store";
import "./styles.css";

class Boundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="gate">
          <h1 className="logo">Grok 4.7</h1>
          <p>{this.state.error}</p>
          <button type="button" className="send-btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

document.title = "Grok 4.7";
createRoot(document.getElementById("root")!).render(
  <Boundary>
    <MailProvider>
      <App />
    </MailProvider>
  </Boundary>,
);
