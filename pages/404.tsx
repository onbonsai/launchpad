import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@src/components/Button";

export default function Custom404() {
  const router = useRouter();

  return (
    <div className=" flex items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-8xl font-bold ">404</h1>
          <h2 className="mt-6 text-3xl font-extrabold ">Page not found</h2>
          <p className="mt-2 text-sm">Sorry, we couldn't find the page you're looking for.</p>
          <div className="mt-6 space-x-4">
            <Button variant="secondary" size="md" onClick={() => router.back()}>
              Go back
            </Button>
            <Button variant="accentBrand" size="md" onClick={() => router.push("/")}>
              Go home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
