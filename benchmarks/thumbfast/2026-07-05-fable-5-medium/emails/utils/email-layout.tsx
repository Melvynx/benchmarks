import { getServerUrl } from "@/lib/server-url";
import { SiteConfig } from "@/site-config";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import type { PropsWithChildren } from "react";

/**
 * EmailLayout is used to create a layout for your email.
 * @param props.children The children of the layout
 * @param props.disableTailwind If true, the children will be rendered without the Tailwind CSS. It's useful when you want use <Markdown /> tag.
 * @returns
 */
export const EmailLayout = (
  props: PropsWithChildren<{ disableTailwind?: boolean }>,
) => {
  let baseUrl = getServerUrl();

  // Email software can't handle localhost URL
  if (baseUrl.startsWith("http://localhost")) {
    baseUrl = SiteConfig.prodUrl;
  }

  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#f5f5f5",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
          margin: 0,
          padding: "40px 16px",
        }}
      >
        <Container
          style={{
            margin: "0 auto",
            maxWidth: "560px",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "32px 40px 24px",
          }}
        >
          <Tailwind>
            <table cellPadding={0} cellSpacing={0} style={{ margin: "0 auto" }}>
              <tr>
                <td className="pr-2" style={{ paddingRight: "8px" }}>
                  <Img
                    src={`${baseUrl}${SiteConfig.appIcon}`}
                    width={32}
                    height={32}
                    className="inline"
                    alt={`${SiteConfig.title}'s logo`}
                  />
                </td>
                <td>
                  <Text
                    className="text-xl font-bold"
                    style={{ color: "#0f172a", margin: 0 }}
                  >
                    {SiteConfig.title}
                  </Text>
                </td>
              </tr>
            </table>
            <Hr className="mt-3 mb-6 border-gray-300" />
          </Tailwind>
          {props.disableTailwind ? (
            props.children
          ) : (
            <Tailwind>{props.children}</Tailwind>
          )}
          <Tailwind>
            <Hr className="mt-12 mb-6 border-gray-300" />

            <table cellPadding={0} cellSpacing={0} style={{ margin: "0 auto" }}>
              <tr>
                <td className="pr-2" style={{ paddingRight: "8px" }}>
                  <Img
                    src={`${baseUrl}${SiteConfig.appIcon}`}
                    width={32}
                    height={32}
                    className="inline"
                    alt={`${SiteConfig.title}'s logo`}
                  />
                </td>
                <td>
                  <Text
                    className="text-xl"
                    style={{ color: "#0f172a", margin: 0 }}
                  >
                    {SiteConfig.title}
                  </Text>
                </td>
              </tr>
            </table>
            <Text
              className="text-sm text-gray-500"
              style={{ textAlign: "center" }}
            >
              {SiteConfig.company.name}
            </Text>
            <Text
              className="text-sm text-gray-500"
              style={{ textAlign: "center" }}
            >
              {SiteConfig.company.address}
            </Text>
          </Tailwind>
        </Container>
      </Body>
    </Html>
  );
};
