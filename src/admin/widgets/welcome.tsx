import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"

const WelcomeWidget = () => {
  return (
    <Container className="p-8">
      <Heading level="h1" className="mb-2">
        Welcome to your Shop!
      </Heading>
      <Text>
        Your Medusa dashboard is now successfully built and ready for management.
      </Text>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.after",
})

export default WelcomeWidget
