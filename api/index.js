import axios from "axios";
// get mobile enabled
export const getMobileEnabled = async (id) => {
  try {
    const data = axios.get(
      `https://api.my-rent.net/mcm/check_for_scaning?worker_id=${id}`
    );

    console.log(data);

    if (!data.ok) {
      throw new Error("Failed to get data");
    }

    const is_mobile = await data.json();

    console.log(is_mobile);

    return {
      success: true,
      data: is_mobile,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error,
    };
  }
};
