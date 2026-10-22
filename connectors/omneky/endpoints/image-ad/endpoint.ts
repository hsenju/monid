import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import {
    zOmnekyImageAdBody,
    zOmnekyImageBrandMetadata,
    zOmnekyImageGenerationMetadata,
    zOmnekyImageProductMetadata,
} from "./schema/inputs.ts";

/**
 * POST /create_image_ad_async — one brand-aligned image ad per run.
 *
 * Binding (D25): `no_of_ads` and `job_ids` are omitted, so a run is exactly
 * one job and one flat charge; `callback_url` is omitted because Monid polls.
 * `resolution` is pinned to "1K" — the only resolution the flat rate below
 * is stated for. `product_images` is required whenever `product_metadata`
 * is sent (the vendor rejects its absence).
 */
export default defineEndpoint({
    meta: {
        displayName: "Omneky Image Ad",
        summary: "Generate one finished, on-brand image ad from a brand URL.",
        description: "Render a finished image advertisement in the brand's " +
            "own look. Omneky scrapes `brand_metadata.brand_url` (and " +
            "`product_metadata.product_url`) for logos, colors, fonts, " +
            "headlines and product details, writes an ad concept unless " +
            "you give `generation_metadata.user_direction`, and generates " +
            "the ad with your headline / subheadline / CTA / offer copy " +
            "(or copy it extracted). Explicit brand images, fonts and " +
            "colors override what it scrapes. Choose the aspect ratio, " +
            "language, text-free output and a reference layout to emulate. " +
            "Returns the finished job; `result_url` is the ad image. One " +
            "ad per call. For a short product video ad use Omneky " +
            "/v1/video-ad instead.",
        docsUrl: "https://www.omneky.com/api-docs",
        categories: ["image-generation"],
        notes: [
            "Brand onboarding failures (an unreachable brand_url) do not " +
            "fail the job; generation continues with whatever was supplied.",
            "Provide brand_metadata.brand_url or brand_metadata.brand_images.",
        ],
    },
    endpoint: "/v1/image-ad",
    request: { method: "POST", path: "/create_image_ad_async" },
    input: {
        schema: {
            body: zOmnekyImageAdBody.omit({
                no_of_ads: true,
                job_ids: true,
                callback_url: true,
            }).extend({
                brand_metadata: zOmnekyImageBrandMetadata.strict(),
                product_metadata: zOmnekyImageProductMetadata.extend({
                    product_images: zOmnekyImageProductMetadata.shape
                        .product_images.unwrap(),
                }).strict().optional(),
                generation_metadata: zOmnekyImageGenerationMetadata.extend({
                    resolution: z.enum(["1K"]).describe(
                        'Output resolution. Only "1K" (the default) is ' +
                            "offered here.",
                    ).optional(),
                }).strict().optional(),
            }).strict(),
        },
    },
    timeouts: { requestMs: 30_000, runMs: 1_800_000, pollMs: 30_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            // PRICING: Omneky reserves IMAGE_AD_CREDIT_COST (5) credits per
            // 1K image job at submit. Pending Omneky confirmation.
            consumes: { credit: "default", amount: 5 },
        },
    },
});
