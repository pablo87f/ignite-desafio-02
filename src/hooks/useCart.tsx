import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const RocketShoesCart = "@RocketShoes:cart";

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(RocketShoesCart);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const productResponse = await api.get<Product>(`/products/${productId}`);

      const productStock = stockResponse.data;
      const product = productResponse.data;

      const productCartIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (productCartIndex >= 0) {
        if (cart[productCartIndex].amount >= productStock.amount) {
          throw new Error("Quantidade solicitada fora de estoque");
        }
        cart[productCartIndex].amount += 1;
        setCart([...cart]);
        localStorage.setItem(RocketShoesCart, JSON.stringify([...cart]));
      } else {
        if (productStock.amount < 1) {
          throw new Error(`Quantidade solicitada fora de estoque`);
        }

        const newProduct: Product = { ...product, amount: 1 };
        const newCart = [...cart, newProduct];
        setCart(newCart);
        localStorage.setItem(RocketShoesCart, JSON.stringify(newCart));
      }
    } catch (ex) {
      if (ex?.response?.status === 404) {
        toast.error("Erro na adição do produto");
      }
      toast.error(ex.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productCartIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (productCartIndex >= 0) {
        cart.splice(productCartIndex, 1);

        setCart([...cart]);
        localStorage.setItem(RocketShoesCart, JSON.stringify([...cart]));
      } else {
        throw new Error("Erro na remoção do produto");
      }
    } catch (ex) {
      toast.error(ex.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return;
      }

      const productCartIndex = await cart.findIndex(
        (product) => product.id === productId
      );

      if (productCartIndex >= 0) {
        const stockResponse = await api.get<Stock>(`/stock/${productId}`);
        const productStockAmount = stockResponse.data.amount;

        const product = cart[productCartIndex];

        if (amount > productStockAmount) {
          throw new Error("Quantidade solicitada fora de estoque");
        }
        product.amount = amount;
        cart[productCartIndex] = product;

        setCart([...cart]);
        localStorage.setItem(RocketShoesCart, JSON.stringify([...cart]));
      } else {
        throw new Error("Erro na alteração de quantidade do produto");
      }
    } catch (ex) {
      toast.error(ex.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
