import com.expediagroup.graphql.plugin.gradle.config.GraphQLScalar
import com.expediagroup.graphql.plugin.gradle.config.GraphQLSerializer
import com.expediagroup.graphql.plugin.gradle.graphql

description = "Example usage of Gradle plugin to generate GraphQL Kotlin Client"

plugins {
    application
    kotlin("plugin.serialization")
    id("com.expediagroup.graphql")
}

val ktorVersion: String by project
dependencies {
    implementation("com.expediagroup", "graphql-kotlin-ktor-client")
    implementation("io.ktor:ktor-client-okhttp:$ktorVersion")
    implementation("io.ktor:ktor-client-logging-jvm:$ktorVersion")
}

application {
    mainClass.set("com.natwelch.etu")
}

graphql {
    client {
        // target GraphQL endpoint
        endpoint = "https://graphql.natwelch.com/graphql"
        // package for generated client code
        packageName = "com.natwelch.graphql.generated"
        clientType = GraphQLClientType.KTOR
    }
}

ktlint {
    filter {
        exclude("**/generated/**")
    }
}