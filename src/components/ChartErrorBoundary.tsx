//========================================
// src/components/ChartErrorBoundary.tsx
// An error boundary file this never blanks the whole app again
// Some future bad tick/feed hiccup could throw somewhere else in the chart tree. 
// A boundary scoped per-chart limits the blast radius to one panel.
//========================================

import { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    message: string;
}

export class ChartErrorBoundary extends Component<Props, State> {

    state: State = {
        hasError: false,
        message: ""
    };

    static getDerivedStateFromError(error: unknown): State {
        return {
            hasError: true,
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown chart error"
        };
    }

    render() {

        if (this.state.hasError) {
            return (
                <div
                    style={{
                        padding: 12,
                        color: "#ff6666",
                        background: "#1a0000",
                        fontSize: 12
                    }}
                >
                    Chart failed to render: {this.state.message}
                </div>
            );
        }

        return this.props.children;

    }

}