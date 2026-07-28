import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../components/badge";

const meta: Meta<typeof Badge> = {
  title: "Core/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Active Status",
    variant: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Draft",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Failed",
    variant: "destructive",
  },
};
