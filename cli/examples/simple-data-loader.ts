// Example data loader with async function
export const data = async () => {
  // Simulate async data loading (e.g., from API or database)
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    name: 'Dynamic-Report-2024',
    title: 'Dynamically Loaded Report',
    sections: [
      {
        title: 'Dynamic Data',
        content: `This data was loaded asynchronously at ${new Date().toISOString()}.`,
      },
      {
        title: 'Benefits',
        content: 'Using a data loader allows you to fetch data from APIs, databases, or perform computations before rendering.',
      },
    ],
  };
};
