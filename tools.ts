
import { FunctionDeclaration, Type } from "@google/genai";

export const TODO_TOOLS: FunctionDeclaration[] = [
  {
    name: "create_todo",
    description: "Create a new task or subtask. STRICTLY ONLY use this function when the user EXPLICITLY asks to 'add', 'create', or 'remind' them of a specific task. DO NOT create tasks based on inference, context from previous conversations, or assumptions. If the user asks to 'query', 'check', or 'list' tasks, use get_todos instead.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "The content/title of the task."
        },
        parent_id: {
          type: Type.STRING,
          description: "Optional. The ID of the parent task if this is a subtask."
        }
      },
      required: ["text"]
    }
  },
  {
    name: "update_todo",
    description: "Update an existing task's status or text.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.STRING,
          description: "The ID of the task to update."
        },
        completed: {
          type: Type.BOOLEAN,
          description: "Set to true to mark as done, false for active."
        },
        text: {
          type: Type.STRING,
          description: "New text content for the task."
        }
      },
      required: ["id"]
    }
  },
  {
    name: "delete_todo",
    description: "Permanently remove a task.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.STRING,
          description: "The ID of the task to delete."
        }
      },
      required: ["id"]
    }
  },
  {
    name: "get_todos",
    description: "Retrieve the current list of tasks to check their status or IDs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filter: {
          type: Type.STRING,
          enum: ["all", "active", "completed"],
          description: "Filter which tasks to retrieve."
        }
      }
    }
  }
];
