import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/card";
import { Button } from "../components/button";

const meta: Meta<typeof Card> = {
  title: "Core/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;

export const SimpleCard = () => (
  <Card className="w-[350px]">
    <CardHeader>
      <CardTitle>Customer Overview</CardTitle>
      <CardDescription>View latest activity and transaction logs.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">Active orders: 12</p>
    </CardContent>
    <CardFooter className="flex justify-between">
      <Button variant="outline">Dismiss</Button>
      <Button>View Details</Button>
    </CardFooter>
  </Card>
);
