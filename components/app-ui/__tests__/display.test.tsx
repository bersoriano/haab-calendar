import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  Alert,
  Avatar,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  DescriptionItem,
  DescriptionList,
  EmptyState,
  Skeleton,
  StackedList,
  StackedListHeading,
  StackedListItem,
  Stat,
  StatGroup,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/app-ui";

describe("Card", () => {
  it("renders one flat surface with header, body and footer", () => {
    const html = renderToStaticMarkup(
      <Card as="section">
        <CardHeader title="Weekly hours" description="When clients can book" actions={<button>Add</button>} />
        <CardBody>Rows</CardBody>
        <CardFooter>
          <button>Save</button>
        </CardFooter>
      </Card>,
    );
    expect(html).toMatch(/^<section[^>]*ring-app-border/);
    expect(html).toMatch(/<h2[^>]*>Weekly hours<\/h2>/);
    expect(html).toContain("When clients can book");
    expect(html).toContain("border-t border-app-border");
  });
});

describe("StatGroup", () => {
  it("is a definition list of label/value pairs", () => {
    const html = renderToStaticMarkup(
      <StatGroup columns={4}>
        <Stat label="Upcoming" value={3} detail="Next 7 days" />
      </StatGroup>,
    );
    expect(html).toMatch(/^<dl/);
    expect(html).toMatch(/<dt[^>]*>Upcoming<\/dt>/);
    expect(html).toContain("tabular-nums");
    expect(html).toContain("lg:grid-cols-4");
  });
});

describe("Stat link", () => {
  it("links the stat with an accessible name that includes its label", () => {
    const html = renderToStaticMarkup(
      <StatGroup>
        <Stat label="Upcoming" value={3} href="/dashboard/bookings" linkLabel="View all" />
      </StatGroup>,
    );
    expect(html).toMatch(/<a[^>]*href="\/dashboard\/bookings"[^>]*>View all<span class="sr-only"> Upcoming<\/span><\/a>/);
  });

  it("hands clicks to the caller for client-side navigation", () => {
    const onClick = () => undefined;
    const element = Stat({ label: "Services", value: 1, href: "/dashboard/services", linkLabel: "View", onClick });
    const html = renderToStaticMarkup(<StatGroup>{element}</StatGroup>);
    expect(html).toContain('href="/dashboard/services"');
  });

  it("renders no link without an href", () => {
    const html = renderToStaticMarkup(
      <StatGroup>
        <Stat label="Total" value={9} />
      </StatGroup>,
    );
    expect(html).not.toContain("<a");
  });
});

describe("Avatar", () => {
  it("falls back to the first initial without an image", () => {
    const html = renderToStaticMarkup(<Avatar name="rivera clinic" />);
    expect(html).toContain(">R<");
    expect(html).not.toContain("<img");
  });

  it("shows the image with empty alt when given one", () => {
    const html = renderToStaticMarkup(<Avatar name="Rivera" src="/logo.png" />);
    expect(html).toContain('src="/logo.png"');
    expect(html).toContain('alt=""');
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive tech", () => {
    expect(renderToStaticMarkup(<Skeleton className="h-4" />)).toContain('aria-hidden="true"');
  });
});

describe("EmptyState", () => {
  it("titles the empty list and offers its action", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No bookings yet" body="They appear here." action={<button>Share</button>} variant="dashed" />,
    );
    expect(html).toMatch(/<h3[^>]*>No bookings yet<\/h3>/);
    expect(html).toContain("border-dashed");
    expect(html).toContain("Share");
  });
});

describe("Alert", () => {
  it("uses the tone's tokens and carries its role", () => {
    const html = renderToStaticMarkup(
      <Alert tone="danger" role="alert" title="Could not save">
        Try again.
      </Alert>,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("bg-app-danger-soft");
    expect(html).toContain("Could not save");
  });

  it("offers a dismiss button only when dismissable", () => {
    expect(renderToStaticMarkup(<Alert tone="info">Hi</Alert>)).not.toContain("<button");
    const html = renderToStaticMarkup(
      <Alert tone="info" onDismiss={() => undefined} dismissLabel="Dismiss">
        Hi
      </Alert>,
    );
    expect(html).toContain('aria-label="Dismiss"');
  });
});

describe("StackedList", () => {
  it("renders a list with sticky group headings", () => {
    const html = renderToStaticMarkup(
      <div>
        <StackedListHeading id="today">Today</StackedListHeading>
        <StackedList>
          <StackedListItem trailing={<button>Cancel</button>}>Ana</StackedListItem>
        </StackedList>
      </div>,
    );
    expect(html).toMatch(/<h3[^>]*id="today"[^>]*>Today<\/h3>/);
    expect(html).toContain("sticky");
    expect(html).toMatch(/<ul[^>]*role="list"/);
    expect(html).toContain("<li");
  });
});

describe("Table", () => {
  it("scrolls inside its wrapper and scopes column heads", () => {
    const html = renderToStaticMarkup(
      <Table>
        <THead>
          <Tr>
            <Th>Account</Th>
          </Tr>
        </THead>
        <TBody>
          <Tr>
            <Td>a@b.c</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    expect(html).toMatch(/^<div[^>]*overflow-x-auto/);
    expect(html).toContain('scope="col"');
  });
});

describe("DescriptionList", () => {
  it("pairs terms with values", () => {
    const html = renderToStaticMarkup(
      <DescriptionList>
        <DescriptionItem term="Calendar">Work</DescriptionItem>
      </DescriptionList>,
    );
    expect(html).toMatch(/<dt[^>]*>Calendar<\/dt>/);
    expect(html).toContain("break-words");
  });
});
