import {defineConfig} from "vite";
import dtsPlugin from "vite-plugin-dts";

export default defineConfig({
    build:{
        sourcemap: true,
        lib:{
            entry: "./src/main.ts",
            formats: ['es','umd'],
            name: "rbtPlayer"
        }
    },
    plugins: [
        dtsPlugin({  rollupTypes : true  })
    ]
})