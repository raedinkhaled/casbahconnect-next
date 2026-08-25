import Image from "next/image";

export const metadata = {
  title: "Find Jobs | Casbah Connect",
};

const Page = () => {
  return (
    <div className="mt-24 flex w-full flex-col items-center justify-center text-center">
      <Image
        src="/assets/images/light-illustration.png"
        alt="Find Jobs coming soon"
        width={270}
        height={200}
        className="block object-contain dark:hidden"
      />
      <Image
        src="/assets/images/dark-illustration.png"
        alt="Find Jobs coming soon"
        width={270}
        height={200}
        className="hidden object-contain dark:flex"
      />

      <h1 className="h1-bold text-dark100_light900 mt-8">Find Jobs</h1>
      <p className="body-regular text-dark500_light700 my-3.5 max-w-md">
        We&apos;re building a job board where you can discover opportunities
        from the Casbah Connect community. Coming soon.
      </p>
    </div>
  );
};

export default Page;
